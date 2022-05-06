/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:13
 * @LastEditTime: 2022-05-05 13:48:20
 * @LastEditors: Quarter
 * @Description: JSONP 轮询器
 * @FilePath: /socket.io-client/engine.io-client/transports/polling-jsonp.ts
 */

import Polling from "./polling";
import globalThis from "../globalThis";
import { type TransportOptions } from "../transport";

// 全局存储回调函数
let callbacks: any;
const rNewline = /\n/g;
const rEscapedNewline = /\\n/g;

class JSONPPolling extends Polling {
  constructor(opts: TransportOptions) {
    super(opts);

    this.query = this.query || {};

    if (!callbacks) {
      callbacks = globalThis.___eio = (globalThis.___eio || []);
    }
    this.index = callbacks.length;
    callbacks.push((msg: any) => {
      this.onData(msg);
    });
    this.query.j = this.index;

    // prevent spurious errors from being emitted when the window is unloaded
    if (typeof addEventListener === "function") {
      addEventListener("beforeunload", () => {
        if (this.script) this.script.onerror = () => { };
      }, false);
    }
  }

  area: HTMLTextAreaElement | null = null; // 文本域元素
  form: HTMLFormElement | null = null; // 表单元素
  iframe: HTMLElement | HTMLIFrameElement | null = null; // iframe 元素
  iframeId = ""; // iframe id
  index = 0; // 索引
  supportsBinary = false; // 是否支持二进制
  script: HTMLScriptElement | null = null; // 脚本元素

  /**
   * @description: 关闭连接逻辑
   * @author: Quarter
   * @return
   */
  doClose(): void {
    if (this.script) {
      this.script.parentNode?.removeChild(this.script);
      this.script = null;
    }

    if (this.form) {
      this.form.parentNode?.removeChild(this.form);
      this.form = null;
      this.iframe = null;
    }

    super.doClose();
  }

  /**
   * @description: 轮询逻辑
   * @author: Quarter
   * @return
   */
  doPoll(): void {
    const script = document.createElement("script");

    if (this.script instanceof HTMLScriptElement) {
      this.script.parentNode?.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.uri();
    script.onerror = (e) => {
      this.onError("jsonp poll error", e.toString());
    };

    const insertAt = document.getElementsByTagName("script")[0];
    if (insertAt) {
      insertAt.parentNode?.insertBefore(script, insertAt);
    } else {
      (document.head || document.body).appendChild(script);
    }
    this.script = script;

    const isUAgecko = "undefined" !== typeof navigator && /gecko/i.test(navigator.userAgent);

    if (isUAgecko) {
      setTimeout(() => {
        const iframe = document.createElement("iframe");
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  }

  /**
   * @description: 数据写入
   * @author: Quarter
   * @param {string} data 数据
   * @param {function} fn 回调函数
   * @return
   */
  doWrite(data: string, fn: () => void): void {
    if (!this.form) {
      const form = document.createElement("form");
      const area = document.createElement("textarea");
      const id = this.iframeId = "eio_iframe_" + this.index;

      form.className = "socketio";
      form.style.position = "absolute";
      form.style.top = "-1000px";
      form.style.left = "-1000px";
      form.target = id;
      form.method = "POST";
      form.setAttribute("accept-charset", "utf-8");
      area.name = "d";
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.uri();

    const complete = (): void => {
      initIframe();
      fn();
    };

    const initIframe = (): void => {
      if (this.iframe) {
        try {
          this.form?.removeChild(this.iframe);
        } catch (e: any) {
          this.onError("jsonp polling iframe removal error", e.toString());
        }
      }
      let iframe: HTMLElement | HTMLIFrameElement | null = null;

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        const html = `<iframe src="javascript: 0" name="${this.iframeId}">`;
        iframe = document.createElement(html);
      } catch (e) {
        iframe = document.createElement("iframe");
        (iframe as HTMLIFrameElement).name = this.iframeId;
        (iframe as HTMLIFrameElement).src = "javascript:0";
      }

      iframe.id = this.iframeId;

      this.form?.appendChild(iframe);
      this.iframe = iframe;
    };

    initIframe();

    // escape \n to prevent it from being converted into \r\n by some UAs
    // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
    data = data.replace(rEscapedNewline, "\\\n");
    if (this.area) this.area.value = data.replace(rNewline, "\\n");

    try {
      this.form.submit();
    } catch (e) { }

    if (this.iframe) this.iframe.onload = complete;
  }
}

export default JSONPPolling;