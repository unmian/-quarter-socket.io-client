/*
 * @Author: Quarter
 * @Date: 2022-04-27 03:43:09
 * @LastEditTime: 2022-05-05 13:09:52
 * @LastEditors: Quarter
 * @Description: url 模块
 * @FilePath: /socket.io-client/socket.io-client/url.ts
 */

import Debug from "debug";
import { parseuri, type URIParseResult } from "utils";

// debug 工具
const debug = Debug("socket.io-client:url");

export type URLConfig = URIParseResult & {
  id: string, // 唯一 id
  href: string, // href 地址
};

/**
 * @description: 网址解析器
 * @author: Quarter
 * @param {string} uri uri字符串
 * @param {Location} loc 地址
 * @return {URLConfig}
 */
const url = (uri: string | null, loc: Location = location): URLConfig => {
  let obj: URLConfig = {
    anchor: "",
    authority: "",
    directory: "",
    file: "",
    host: "",
    href: "",
    id: "",
    ipv6uri: false,
    password: "",
    path: "",
    pathNames: [],
    port: "",
    protocol: "",
    query: "",
    queryKey: {},
    relative: "",
    source: "",
    user: "",
    userInfo: "",
  };

  if (null === uri) uri = loc.protocol + "//" + loc.host;

  // 相对地址支持
  if ("string" === typeof uri) {
    if ("/" === uri.charAt(0)) {
      if ("/" === uri.charAt(1)) {
        uri = loc.protocol + uri;
      } else {
        uri = loc.host + uri;
      }
    }

    if (!/^(https?|wss?):\/\//.test(uri)) {
      debug("protocol-less url %s", uri);
      if ("undefined" !== typeof loc) {
        uri = loc.protocol + "//" + uri;
      } else {
        uri = "https://" + uri;
      }
    }

    // 解析 URI 地址
    debug("parse %s", uri);
    obj = Object.assign(obj, parseuri(uri));
  }

  // 默认端口处理
  if (!obj.port) {
    if (/^(http|ws)$/.test(obj.protocol)) {
      obj.port = "80";
    } else if (/^(http|ws)s$/.test(obj.protocol)) {
      obj.port = "443";
    }
  }

  obj.path = obj.path || "/";

  const ipv6 = obj.host.indexOf(":") !== -1;
  const host = ipv6 ? "[" + obj.host + "]" : obj.host;

  // 定义一个唯一 id
  obj.id = obj.protocol + "://" + host + ":" + obj.port;
  // 定义 href 地址
  obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : (":" + obj.port));

  return obj;
};

export default url;