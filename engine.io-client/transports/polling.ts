/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:13
 * @LastEditTime: 2022-05-06 02:20:46
 * @LastEditors: Quarter
 * @Description: 轮询传输通道
 * @FilePath: /socket.io-client/engine.io-client/transports/polling.ts
 */

import Debug from "debug";
import Transport, { TransportOptions } from "../transport";
import { parseqs, yeast } from "utils";
import { decodePayload, encodePayload, TransportPacket } from "engine.io-parser";

const debug = Debug("engine.io-client:polling");

/**
 * @description: 是否支持 XMLHttpRequest 2
 * @author: Quarter
 * @return {boolean}
 */
const hasXHR2 = ((): boolean => {
  const xhr = new XMLHttpRequest();
  return null != xhr.responseType;
})();

class Polling extends Transport {
  constructor(opts: TransportOptions) {
    super(opts);

    if (!hasXHR2 || !!opts.forceBase64) {
      this.supportsBinary = false;
    }
  }

  name = "polling"; // 名称
  polling = false; // 正在轮询
  supportsBinary = false; // 是否支持二进制

  /**
   * @description: 打开连接逻辑
   * @author: Quarter
   * @return
   */
  doOpen(): void {
    this.poll();
  }

  /**
   * @description: 轮询
   * @author: Quarter
   * @return
   */
  poll(): void {
    debug("polling");
    this.polling = true;
    this.doPoll();
    this.emit("poll");
  }

  /**
   * @description: 轮询具体逻辑
   * @author: Quarter
   * @return
   */
  doPoll(): void { }

  /**
   * @description: 暂停
   * @author: Quarter
   * @param {funtion} onPause
   * @return
   */
  pause(onPause: () => void): void {

    this.readyState = "pausing";

    const pause = (): void => {
      debug("paused");
      this.readyState = "paused";
      onPause();
    };

    if (this.polling || !this.writable) {
      let total = 0;

      if (this.polling) {
        debug("we are currently polling - waiting to pause");
        total++;
        this.once("pollComplete", () => {
          debug("pre-pause polling complete");
          --total;
          if (0 === total) pause();
        });
      }

      if (!this.writable) {
        debug("we are currently writing - waiting to pause");
        total++;
        this.once("drain", () => {
          debug("pre-pause writing complete");
          --total;
          if (0 === total) pause();
        });
      }
    } else {
      pause();
    }
  }

  /**
   * @description: 数据传输回调
   * @author: Quarter
   * @param {string} data 数据
   * @return
   */
  onData(data: string): void {
    debug("polling got data %s", data);
    const callback = (packet: TransportPacket, index: number, total: number): false | undefined => {
      console.log(123, "packet", this.readyState, packet);
      // if its the first message we consider the transport open
      if ("opening" === this.readyState && packet.type === "open") {
        this.onOpen();
      }

      // if its a close packet, we close the ongoing requests
      if ("close" === packet.type) {
        this.onClose();
        return false;
      }

      // otherwise bypass onData and handle the message
      this.onPacket(packet);
    };

    // decode payload
    decodePayload(data, callback);

    // if an event did not trigger closing
    if ("closed" !== this.readyState) {
      // if we got data we"re not polling
      this.polling = false;
      this.emit("pollComplete");

      if ("open" === this.readyState) {
        this.poll();
      } else {
        debug(`ignoring poll - transport state "%s"`, this.readyState);
      }
    }
  }

  /**
   * @description: 处理关闭逻辑
   * @author: Quarter
   * @return
   */
  doClose(): void {
    const close = (): void => {
      debug("writing close packet");
      this.write([{ type: "close", data: "" }]);
    };

    if ("open" === this.readyState) {
      debug("transport open - closing");
      close();
    } else {
      // in case we"re trying to close while
      // handshaking is in progress (GH-164)
      debug("transport not open - deferring close");
      this.once("open", close);
    }
  }

  /**
   * @description: 写入数据包
   * @author: Quarter
   * @param {TransportPacket} packets 数据包
   * @return
   */
  write(packets: TransportPacket[]): void {
    console.log(123, "write", JSON.stringify(packets));
    this.writable = false;
    const callbackfn = (): void => {
      this.writable = true;
      this.emit("drain");
    };

    encodePayload(packets, this.supportsBinary, (data: string | ArrayBuffer): void => {
      this.doWrite(data, callbackfn);
    });
  }

  /**
   * @description: 写入回调
   * @author: Quarter
   * @param {string|ArrayBuffer} data 数据
   * @param {function} callbackfn 回调函数
   * @return
   */
  doWrite(data: string | ArrayBuffer, callbackfn: () => void): void { }

  /**
   * @description: 拼接 URI 地址
   * @author: Quarter
   * @return {string}
   */
  uri(): string {
    const query = this.query || {};
    const schema = this.secure ? "https" : "http";
    let port = "";

    // cache busting is forced
    if (false !== this.timestampRequests) {
      const id = yeast();
      if (id) query[this.timestampParam] = id;
    }

    if (!this.supportsBinary && !query.sid) {
      query.b64 = 1;
    }

    let queryStr = parseqs.encode(query);

    // avoid port if default for schema
    if (this.port && (("https" === schema && Number(this.port) !== 443) ||
      ("http" === schema && Number(this.port) !== 80))) {
      port = ":" + this.port;
    }

    // prepend ? to query
    if (queryStr.length) {
      queryStr = "?" + queryStr;
    }

    const ipv6 = this.hostname.indexOf(":") !== -1;
    return schema + "://" + (ipv6 ? "[" + this.hostname + "]" : this.hostname) + port + this.path + queryStr;
  }
}


export default Polling;