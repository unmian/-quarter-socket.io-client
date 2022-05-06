/*
 * @Author: Quarter
 * @Date: 2022-04-29 01:00:50
 * @LastEditTime: 2022-05-06 06:14:19
 * @LastEditors: Quarter
 * @Description: XMLHttpRequest 封装
 * @FilePath: /socket.io-client/engine.io-client/transports/request.ts
 */

import Debug from "debug";
import { Emitter } from "utils";

const debug = Debug("engine.io-client:request");

type RequestMethod = "GET" | "POST" | "get" | "post";
export interface RequestOptions {
  agent?: string | false; // 代理信息
  async?: boolean; // 是否异步
  data?: Document | XMLHttpRequestBodyInit | null | undefined; // 传输数据
  enablesXDR?: boolean; // 是否允许跨域
  extraHeaders?: { [key: string]: string; }; // 额外请求头
  isBinary?: boolean; // 是否二进制数据
  method?: RequestMethod; // 请求方法
  requestTimeout?: number; // 请求超时时间
  supportsBinary?: boolean; // 是否支持二进制数据
  uri: string; // 请求地址
  withCredentials?: boolean; // 是否携带认证
  xd?: boolean; // 是否跨域名
  xs?: boolean; // 是否跨安全协议
}

class PollingRequest extends Emitter {
  constructor(opts: RequestOptions) {
    super();

    this.method = opts.method || "GET";
    this.uri = opts.uri;
    this.xd = !!opts.xd;
    this.xs = !!opts.xs;
    this.async = false !== opts.async;
    this.data = undefined !== opts.data ? opts.data : null;
    if (opts.agent) this.agent = opts.agent;
    this.isBinary = !!opts.isBinary;
    this.supportsBinary = !!opts.supportsBinary;
    this.enablesXDR = !!opts.enablesXDR;
    this.withCredentials = !!opts.withCredentials;
    if (opts.requestTimeout) this.requestTimeout = opts.requestTimeout;
    if (opts.extraHeaders) this.extraHeaders = opts.extraHeaders;

    if (typeof document !== "undefined") {
      if (typeof addEventListener === "function") {
        const terminationEvent = "onpagehide" in globalThis ? "pagehide" : "unload";
        addEventListener(terminationEvent, this._unloadHandler, false);
      }
    }

    this.create();
  }

  agent: string | false = false; // 是否使用代理
  async = true; // 是否异步
  extraHeaders: { [key: string]: string; } = {}; // 额外请求头
  data: Document | XMLHttpRequestBodyInit | null | undefined = null; // 数据内容
  enablesXDR = false; // 是否允许跨域
  index = 0;
  isBinary = false; // 是否二进制数据
  method: RequestMethod = "GET"; // 请求方式
  requests: { [index: number]: PollingRequest } = {}; // 请求仓库
  requestsCount = 0; // 请求数量
  requestTimeout: number | undefined = undefined; // 请求超时时间
  supportsBinary = false; // 是否支持二进制数据
  uri = "/engine.io"; // 请求地址
  withCredentials = false; // 是否携带认证信息
  xd = false; // 是否跨域名
  xhr: XMLHttpRequest | null = null; // xhr 请求器
  xs = false; // 是否跨安全协议

  /**
   * @description: 创建实例
   * @author: Quarter
   * @return
   */
  create(): void {
    const xhr = this.xhr = new XMLHttpRequest();

    try {
      debug("xhr open %s: %s", this.method, this.uri);
      xhr.open(this.method, this.uri, this.async);
      try {
        if (this.extraHeaders) {
          for (const i in this.extraHeaders) {
            if (this.extraHeaders.hasOwnProperty(i)) {
              xhr.setRequestHeader(i, this.extraHeaders[i]);
            }
          }
        }
      } catch (e) {
        throw e;
      }

      if ("POST" === this.method.toUpperCase()) {
        try {
          if (this.isBinary) {
            xhr.setRequestHeader("Content-type", "application/octet-stream");
          } else {
            xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
          }
        } catch (e) {
          throw e;
        }
      }

      try {
        xhr.setRequestHeader("Accept", "*/*");
      } catch (e) {
        throw e;
      }

      // ie6 check
      if ("withCredentials" in xhr) {
        xhr.withCredentials = this.withCredentials;
      }

      if (this.requestTimeout) {
        xhr.timeout = this.requestTimeout;
      }

      if (this.hasXDR()) {
        xhr.addEventListener("load", () => this.onLoad());
        xhr.addEventListener("error", () => this.onXHRError());
      } else {
        xhr.addEventListener("readystatechange", () => this.onReadyStateChange());
      }

      debug("xhr data %s", this.data);
      xhr.send(this.data);
    } catch (e) {
      setTimeout(() => this.onError(e), 0);
      return;
    }

    if (typeof document !== "undefined") {
      this.index = this.requestsCount++;
      this.requests[this.index] = this;
    }
  }

  /**
   * @description: 处理准备状态变化回调
   * @author: Quarter
   * @return
   */
  onReadyStateChange(): void {
    if (this.xhr) {
      if (this.xhr.readyState === 2) {
        try {
          const contentType = this.xhr.getResponseHeader("Content-Type");
          if (this.supportsBinary && contentType === "application/octet-stream" || contentType === "application/octet-stream; charset=UTF-8") {
            this.xhr.responseType = "arraybuffer";
          }
        } catch (e) {
          throw e;
        }
      }
      if (4 !== this.xhr.readyState) return;
      if (200 === this.xhr.status || 1223 === this.xhr.status) {
        this.onLoad();
      } else {
        setTimeout(() => this.onError(typeof this.xhr?.status === "number" ? this.xhr.status : 0), 0);
      }
    }
  }

  /**
   * @description: XHR 发生错误回调逻辑
   * @author: Quarter
   * @return
   */
  onXHRError(): void {
    this.onError(this.xhr?.responseText);
  }

  /**
   * @description: 成功回调逻辑
   * @author: Quarter
   * @return
   */
  onSuccess(): void {
    this.emit("success");
    this.cleanup();
  }

  /**
   * @description: 数据传输回调逻辑
   * @author: Quarter
   * @param {any} data 响应数据
   * @return
   */
  onData(data: any): void {
    this.emit("data", data);
    this.onSuccess();
  }

  /**
   * @description: 发生错误回调逻辑
   * @author: Quarter
   * @param {any} err 错误信息
   * @return
   */
  onError(err: any): void {
    this.emit("error", err);
    this.cleanup(true);
  }

  /**
   * @description: 清理实现逻辑
   * @author: Quarter
   * @param {boolean} fromError 是否错误销毁
   * @return
   */
  cleanup(fromError?: boolean): void {
    if (this.xhr instanceof XMLHttpRequest) {
      if (fromError) {
        try {
          this.xhr.abort();
        } catch (e) { }
      }

      if (typeof document !== "undefined") {
        delete this.requests[this.index];
      }

      this.xhr = null;
    }
  }

  /**
   * @description: 加载回调逻辑
   * @author: Quarter
   * @return
   */
  onLoad(): void {
    if (this.xhr instanceof XMLHttpRequest) {
      let data;
      try {
        let contentType;
        try {
          contentType = this.xhr.getResponseHeader("Content-Type");
        } catch (e) { }
        if (contentType === "application/octet-stream" || contentType === "application/octet-stream; charset=UTF-8") {
          data = this.xhr.response || this.xhr.responseText;
        } else {
          data = this.xhr.responseText;
        }
      } catch (e) {
        this.onError(e);
      }
      if (null != data) {
        this.onData(data);
      }
    }
  }

  /**
   * @description: 是否跨域请求
   * @author: Quarter
   * @return {boolean}
   */
  hasXDR(): boolean {
    // @ts-ignore
    return typeof XDomainRequest !== "undefined" && !this.xs && this.enablesXDR;
  }

  /**
   * @description: 退出请求
   * @author: Quarter
   * @return
   */
  abort() {
    this.cleanup();
  }

  /**
   * @description: 离开页面逻辑处理
   * @author: Quarter
   * @return
   */
  _unloadHandler(): void {
    for (const i in this.requests) {
      if (this.requests.hasOwnProperty(i)) {
        this.requests[i].abort();
      }
    }
  }
}

export default PollingRequest;