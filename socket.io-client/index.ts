/*
 * @Author: Quarter
 * @Date: 2022-04-27 03:40:05
 * @LastEditTime: 2022-05-05 13:31:24
 * @LastEditors: Quarter
 * @Description: 入口文件
 * @FilePath: /socket.io-client/socket.io-client/index.ts
 */

import Debug from "debug";
import { Manager, ManagerOptions } from "./manager";
import { Socket, type SocketOptions } from "./socket";
import url from "./url";
import * as parser from "socket.io-parser";

const debug = Debug("socket.io-client");

export type LookupOptions = SocketOptions & ManagerOptions & {
  forceNew?: boolean; // 强制新建
  "force new connection"?: boolean; // 强制新建
  multiplex?: boolean; // 多路复用
};

export const protocol = parser.protocol;

// 缓存管理
const cache: { [id: string]: Manager; } = {};

const lookup = (uri: string | LookupOptions | null, opts?: LookupOptions): Socket => {
  if (typeof uri === "object") {
    opts = uri as ManagerOptions;
    uri = null;
  }

  opts = opts || {};

  const parsed = url(uri || null);
  const source = parsed.source;
  const id = parsed.id;
  const path = parsed.path;
  const sameNamespace = cache[id] && path in cache[id].nsps;
  const newConnection = opts.forceNew || opts["force new connection"] ||
    false === opts.multiplex || sameNamespace;

  let io: Manager;

  if (newConnection) {
    debug("ignoring socket cache for %s", source);
    io = new Manager(source, opts);
  } else {
    if (!cache[id]) {
      debug("new io instance for %s", source);
      cache[id] = new Manager(source, opts);
    }
    io = cache[id];
  }
  if (parsed.query && !opts.query) {
    opts.query = parsed.query;
  }
  return io.socket(path, opts);
};

export const managers = cache;
export const connect = lookup;
export default lookup;

export * from "./manager";
export * from "./socket";
