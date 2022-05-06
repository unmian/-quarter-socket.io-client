/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:13
 * @LastEditTime: 2022-05-05 13:55:10
 * @LastEditors: Quarter
 * @Description: websocket 传输通道
 * @FilePath: /socket.io-client/engine.io-client/transports/websocket.ts
 */

import Debug from "debug";
import Transport, { TransportOptions, TransportProtocol } from "../transport";
import { Emitter, parseqs, yeast } from "utils";
import { encodePacket, TransportPacket } from "engine.io-parser";

const debug = Debug("engine.io-client:websocket");

class WSTransport extends Transport {
  constructor(opts: TransportOptions) {
    super(opts);

    if (!!opts.forceBase64) {
      this.supportsBinary = false;
    }
    this.perMessageDeflate = !!opts.perMessageDeflate;
    this.protocols = opts.protocols || [];
  }

  name = "websocket"; // 名称
  perMessageDeflate = false;
  protocols: TransportProtocol[] = []; // 传输协议
  supportsBinary = true; // 是否支持二进制数据
  usingBrowserWebSocket = true;
  ws?: WebSocket;

  /**
   * @description: 处理通道打开逻辑
   * @author: Quarter
   * @return
   */
  doOpen(): Emitter | undefined {
    debug(`opening transport "websocket"`);
    if (!this.check()) {
      // let probe timeout
      return;
    }

    const uri = this.uri();
    const protocols = this.protocols;

    try {
      this.ws = new WebSocket(uri, protocols);
    } catch (err) {
      return this.emit("error", err);
    }

    if (this.ws.binaryType === undefined) {
      this.supportsBinary = false;
    } else {
      this.ws.binaryType = "arraybuffer";
    }

    this.addEventListeners();
  }

  /**
   * @description: 事件监听
   * @author: Quarter
   * @return
   */
  addEventListeners(): void {
    if (this.ws instanceof WebSocket) {
      this.ws.addEventListener("open", () => {
        this.onOpen();
      });
      this.ws.addEventListener("close", () => {
        this.onClose();
      });
      this.ws.addEventListener("message", (ev: MessageEvent) => {
        this.onData(ev.data);
      });
      this.ws.addEventListener("error", (e) => {
        this.onError("websocket error", e.toString());
      });
    }
  }

  /**
   * @description: 数据写入
   * @author: Quarter
   * @param {TransportPacket[]} packets 数据包
   * @return
   */
  write(packets: TransportPacket[]): void {
    this.writable = false;

    // 写入完成
    const done = (): void => {
      this.emit("flush");

      // fake drain
      // defer to next tick to allow Socket to clear writeBuffer
      setTimeout(() => {
        this.writable = true;
        this.emit("drain");
      }, 0);
    };

    let total = packets.length;
    for (let i = 0, l = total; i < l; i++) {
      ((packet: TransportPacket) => {
        encodePacket(packet, this.supportsBinary, (data: string | ArrayBuffer) => {
          try {
            if (this.usingBrowserWebSocket) {
              this.ws?.send(data);
            }
          } catch (e) {
            debug("websocket closed before onclose event");
          }
          --total;
          if (total === 0) done();
        });
      })(packets[i]);
    }
  }

  /**
   * @description: 关闭连接
   * @author: Quarter
   * @return
   */
  doClose(): void {
    if (typeof this.ws !== "undefined") {
      this.ws.close();
    }
  }

  /**
   * @description: uri 地址
   * @author: Quarter
   * @return {string}
   */
  uri(): string {
    const query = this.query || {};
    const schema = this.secure ? "wss" : "ws";
    let port = "";

    // avoid port if default for schema
    if (this.port && (("wss" === schema && Number(this.port) !== 443) ||
      ("ws" === schema && Number(this.port) !== 80))) {
      port = ":" + this.port;
    }

    // append timestamp to URI
    if (this.timestampRequests) {
      const id = yeast();
      if (id) query[this.timestampParam] = id;
    }

    // communicate binary support capabilities
    if (!this.supportsBinary) {
      query.b64 = 1;
    }

    let queryStr = parseqs.encode(query);

    // prepend ? to query
    if (queryStr.length) {
      queryStr = "?" + queryStr;
    }

    const ipv6 = this.hostname.indexOf(":") !== -1;
    return schema + "://" + (ipv6 ? `[${this.hostname}]` : this.hostname) + port + this.path + queryStr;
  }

  /**
   * @description: 校验
   * @author: Quarter
   * @return {boolean}
   */
  check(): boolean {
    return !!WebSocket && !("__initialize" in WebSocket && this.name === "websocket");
  }
}


export default WSTransport;