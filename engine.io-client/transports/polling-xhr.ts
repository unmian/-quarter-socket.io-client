/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:13
 * @LastEditTime: 2022-05-05 13:47:51
 * @LastEditors: Quarter
 * @Description: XMLHttpRequest 轮询通道
 * @FilePath: /socket.io-client/engine.io-client/transports/polling-xhr.ts
 */

import Debug from "debug";
import Polling from "./polling";
import PollingRequest, { RequestOptions } from "./request";
import { TransportOptions } from "../transport";

const debug = Debug("engine.io-client:polling-xhr");

class XHRPolling extends Polling {
  constructor(opts: TransportOptions) {
    super(opts);

    if (opts.requestTimeout) this.requestTimeout = opts.requestTimeout;
    if (opts.extraHeaders) this.extraHeaders = opts.extraHeaders;

    if (typeof location !== "undefined") {
      const isSSL = "https:" === location.protocol;
      let port: string | number = location.port;

      // some user agents have empty `location.port`
      if (!port) {
        port = isSSL ? 443 : 80;
      }

      this.xd = (typeof location !== "undefined" && opts.hostname !== location.hostname) ||
        port !== opts.port;
      this.xs = opts.secure !== isSSL;
    }
    this.supportsBinary = true;
  }

  requestTimeout = 1000; // 请求超市时间
  extraHeaders: { [key: string]: string; } = {}; // 额外请求头
  pollXhr: PollingRequest | null = null; // 轮询请求器
  sendXhr: PollingRequest | null = null; // 数据发送请求器
  xd = false; // 是否跨站
  xs = false; // 是否跨安全协议

  /**
   * @description: 发送请求
   * @author: Quarter
   * @param {RequestOptions} opts 配置项
   * @return
   */
  request(opts: RequestOptions): PollingRequest {
    opts.xd = this.xd;
    opts.xs = this.xs;
    opts.agent = this.agent || false;
    opts.supportsBinary = this.supportsBinary;
    opts.enablesXDR = this.enablesXDR;
    opts.withCredentials = this.withCredentials;

    return new PollingRequest(opts);
  }

  /**
   * @description: 数据写入逻辑
   * @author: Quarter
   * @param {string|ArrayBuffer} data 数据写入
   * @param {function} fn 回调函数
   * @return
   */
  doWrite(data: string | ArrayBuffer, fn: () => void): void {
    const isBinary = typeof data !== "string" && data !== undefined;
    const req = this.request({ method: "POST", uri: this.uri(), data, isBinary });
    req.on("success", fn, this);
    req.on("error", (err: any) => {
      this.onError("xhr post error", err);
    });
    this.sendXhr = req;
  }

  /**
   * @description: 轮询实现逻辑
   * @author: Quarter
   * @return
   */
  doPoll(): void {
    debug("xhr poll");
    const req = this.request({ uri: this.uri() });
    req.on("data", this.onData, this);
    req.on("error", (err: any) => {
      this.onError("xhr poll error", err);
    });
    this.pollXhr = req;
  }
}


export default XHRPolling;