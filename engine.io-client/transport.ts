/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:15
 * @LastEditTime: 2022-05-05 14:13:36
 * @LastEditors: Quarter
 * @Description: 传输
 * @FilePath: /socket.io-client/engine.io-client/transport.ts
 */

import { decodePacket, TransportPacket } from "engine.io-parser";
import TransportError from "./transport-error";
import { Emitter } from "utils";
import Socket from "./socket";

type ReadyState = "opening" | "open" | "pausing" | "paused" | "closed" | "";

export type TransportProtocol = "polling" | "websocket";

export interface TransportOptions {
  path: string; // 路径
  hostname: string; // 主机名
  port: string | number; // 端口号
  secure?: boolean; // 是否安全
  query?: { [key: string]: string | number; };
  timestampParam?: string; // 时间戳参数
  timestampRequests?: boolean; // 时间戳请求
  agent?: string | false; // 是否代理
  socket: Socket;
  enablesXDR?: boolean; // 是否启用 sXDR
  withCredentials?: boolean; // 是否认证
  isReactNative?: boolean; // 是否是 react native 环境
  extraHeaders?: { [key: string]: string; }; // 额外的请求头
  perMessageDeflate?: boolean;
  forceBase64?: boolean; // 是否强制 base64
  protocols?: TransportProtocol[]; // 传输协议
  requestTimeout?: number; // 请求超时
  forceJSONP?: boolean; // 强制使用 JSONP
  jsonp?: boolean; // 是否使用 jsonp
  xdomain?: boolean; // 跨域名
  xscheme?: boolean; // 跨协议
}

class Transport extends Emitter {
  constructor(opts: TransportOptions) {
    super();

    this.path = opts.path;
    this.hostname = opts.hostname;
    this.port = opts.port;
    this.secure = !!opts.secure;
    if (opts.query) this.query = opts.query;
    if (opts.timestampParam) this.timestampParam = opts.timestampParam;
    if (opts.timestampRequests) this.timestampRequests = opts.timestampRequests;
    this.readyState = "";
    this.agent = opts.agent || false;
    this.socket = opts.socket;
    this.enablesXDR = !!opts.enablesXDR;
    this.withCredentials = !!opts.withCredentials;
    this.isReactNative = !!opts.isReactNative;
    if (opts.extraHeaders) this.extraHeaders = opts.extraHeaders;
  }

  name = "transport"; // 名称
  path = "/engine.io"; // 路径
  hostname = "localhost"; // 主机地址
  port: string | number = 80; // 端口号
  secure = false; // 是否安全
  query: { [key: string]: string | number } = {}; // URL 参数
  timestampParam = "t"; // 时间戳参数
  timestampRequests: boolean = false; // 时间戳请求
  readyState: ReadyState = ""; // 准备状体啊
  agent: string | false = false; // 代理设置
  socket!: Socket; // socket
  supportsBinary = false; // 是否支持二进制
  enablesXDR = false; // 是否启用 sXDR
  withCredentials = false; // 是否携带认证信息
  isReactNative = false; // 是否 react native 环境
  extraHeaders: { [key: string]: string; } = {}; // 额外头部信息
  writable = false; // 是否可以写入

  /**
   * @description: 错误回调
   * @author: Quarter
   * @param {string} msg 消息
   * @param {string} desc 描述
   * @return {Transport}
   */
  onError(msg: string, desc?: string): Transport {
    const err = new TransportError(msg, {
      description: desc,
    });
    this.emit("error", err);
    return this;
  }

  /**
   * @description: 打开传输通道
   * @author: Quarter
   * @return {Transport}
   */
  open(): Transport {
    if ("closed" === this.readyState || "" === this.readyState) {
      this.readyState = "opening";
      this.doOpen();
    }

    return this;
  }

  /**
   * @description: 打开传输通道实际逻辑
   * @author: Quarter
   * @return
   */
  doOpen(): Emitter | void { }

  /**
   * @description: 关闭传输通道
   * @author: Quarter
   * @return {Transport}
   */
  close(): Transport {
    if ("opening" === this.readyState || "open" === this.readyState) {
      this.doClose();
      this.onClose();
    }

    return this;
  }

  /**
   * @description: 关闭传输通道实际逻辑
   * @author: Quarter
   * @return
   */
  doClose(): void { };

  /**
   * @description: 发送数据包
   * @author: Quarter
   * @param {TransportPacket[]} packets 数据包
   * @return
   */
  send(packets: TransportPacket[]) {
    if ("open" === this.readyState) {
      this.write(packets);
    } else {
      throw new Error("Transport not open");
    }
  }

  /**
   * @description: 数据写入
   * @author: Quarter
   * @param {TransportPacket[]} packets 数据包
   * @return
   */
  write(packets: TransportPacket[]): void { };

  /**
   * @description: 暂停
   * @author: Quarter
   * @param {function} onPause 回调
   * @return
   */
  pause(onPause: () => void): void { }

  /**
   * @description: 打开回调
   * @author: Quarter
   * @return
   */
  onOpen(): void {
    this.readyState = "open";
    this.writable = true;
    this.emit("open");
  }

  /**
   * @description: 数据接收回调
   * @author: Quarter
   * @param {string} data
   * @return
   */
  onData(data: string): void {
    console.log("data", data);
    const packet = decodePacket(data);
    this.onPacket(packet);
  }

  /**
   * @description: 包解码回调
   * @author: Quarter
   * @param {TransportPacket} packet
   * @return
   */
  onPacket(packet: TransportPacket): void {
    console.log(123, "on-packet", packet);
    this.emit("packet", packet);
  }

  /**
   * @description: 关闭回调函数
   * @author: Quarter
   * @return
   */
  onClose(): void {
    this.readyState = "closed";
    this.emit("close");
  }
}

export default Transport;