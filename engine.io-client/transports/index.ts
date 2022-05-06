/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:13
 * @LastEditTime: 2022-05-05 13:49:57
 * @LastEditors: Quarter
 * @Description: 传输入口
 * @FilePath: /socket.io-client/engine.io-client/transports/index.ts
 */

import XHR from "./polling-xhr";
import JSONP from "./polling-jsonp";
import WSTransport from "./websocket";
import Polling from "./polling";
import { type TransportOptions } from "../transport";

/**
 * @description: websocket 通道构造器
 * @author: Quarter
 * @param {TransportOptions} opts 配置项
 * @return {WSTransport}
 */
export const websocket = (opts: TransportOptions): WSTransport => {
  return new WSTransport(opts);
};

/**
 * @description: 轮询器
 * @author: Quarter
 * @param {PollingOptions} opts 配置项
 * @return {Polling}
 */
export const polling = (opts: TransportOptions): Polling => {
  let xhr;
  let xd = false;
  let xs = false;
  const jsonp = false !== opts.jsonp;

  if (typeof location !== "undefined") {
    const isSSL = "https:" === location.protocol;
    let port: string | number = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    xd = opts.hostname !== location.hostname || port !== opts.port;
    xs = opts.secure !== isSSL;
  }

  opts.xdomain = xd;
  opts.xscheme = xs;
  xhr = new XMLHttpRequest();

  if ("open" in xhr && !opts.forceJSONP) {
    return new XHR(opts);
  } else {
    if (!jsonp) throw new Error("JSONP disabled");
    return new JSONP(opts);
  }
};
