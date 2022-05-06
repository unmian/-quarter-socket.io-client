/*
 * @Author: Quarter
 * @Date: 2022-04-27 03:43:09
 * @LastEditTime: 2022-05-05 13:35:13
 * @LastEditors: Quarter
 * @Description: socket.io 管理器
 * @FilePath: /socket.io-client/socket.io-client/manager.ts
 */

import Debug from "debug";
import eio, { type EngineSocketOptions } from "engine.io-client";
import ManagerError from "./manager-error";
import on from "./on";
import { Socket, type SocketOptions } from "./socket";
import * as parser from "socket.io-parser";
import { Backoff, Emitter } from "utils";

export type ManagerReadyState = "opening" | "open" | "closed";

export type ManagerOptions = EngineSocketOptions & {
  autoConnect?: boolean; // 自动连接
  parser?: typeof parser; // 解析器
  path?: string; // 路径
  randomizationFactor?: number; // 随机因子
  reconnection?: boolean; // 是否重连
  reconnectionAttempts?: number; // 重试次数
  reconnectionDelay?: number; // 重连延迟时间
  reconnectionDelayMax?: number; // 重连最大延迟时间
  timeout?: number; // 超时时间
};

const debug = Debug("socket.io-client:manager");

export class Manager extends Emitter {
  constructor(uri: string | ManagerOptions | undefined, opts?: ManagerOptions) {
    super();

    if (uri && ("object" === typeof uri)) {
      opts = uri;
      uri = undefined;
    }
    opts = opts || {};
    if (opts) {
      opts.path = opts.path || "/socket.io";
      this.nsps = {};
      this.subs = [];
      this.opts = opts;
      this.reconnection(opts.reconnection !== false);
      this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
      this.reconnectionDelay(opts.reconnectionDelay || 1000);
      this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
      this.randomizationFactor(opts.randomizationFactor || 0.5);
      this.backoff = new Backoff({
        min: this._reconnectionDelay,
        max: this._reconnectionDelayMax,
        jitter: this._randomizationFactor,
      });
      this.timeout(undefined === opts.timeout ? 20000 : opts.timeout);
      this.readyState = "closed";
      if ("string" === typeof uri) this.uri = uri;
      this.connecting = [];
      this.lastPing = null;
      this.encoding = false;
      this.packetBuffer = [];
      const _parser = opts.parser || parser;
      this.encoder = new _parser.Encoder();
      this.decoder = new _parser.Decoder();
      this.autoConnect = opts.autoConnect !== false;
      if (this.autoConnect) this.open();
    }
  }

  autoConnect = true; // 自动连接
  backoff = new Backoff({
    min: 1000,
    max: 5000,
    jitter: 0.5,
  }); // 指数退避算法
  connecting: Socket[] = []; // 连接中
  decoder!: parser.Decoder; // 解码器
  encoder!: parser.Encoder; // 编码器
  encoding = false; // 是否编码
  engine!: eio; // engine.io 客户端
  lastPing: Date | null = null; // 最新一次 ping
  nsps: { [nsp: string]: Socket; } = {}; // 命名空间对应 Socket
  opts: ManagerOptions = {}; // 配置项
  packetBuffer: parser.SocketIOPacket[] = []; // 数据包缓冲区
  readyState: ManagerReadyState = "closed";
  reconnecting = false; // 是否正在重连
  skipReconnect = false; // 跳过重连
  subs: ReturnType<typeof on>[] = []; // 事件订阅
  uri: string = "/socket.io";
  _reconnection = true; // 是否重连
  _reconnectionAttempts = Infinity; // 重连次数
  _reconnectionDelay = 1000; // 重连延迟时间
  _randomizationFactor = 0.5; // 随机因子
  _reconnectionDelayMax = 5000; // 重连最大延迟
  _timeout: number | false = 20000; // 超时时间

  /**
   * @description: 触发所有事件
   * @author: Quarter
   * @param {string} eventName 事件名称
   * @return
   */
  emitAll(eventName: string, ...args: any[]): void {
    this.emit(eventName, ...args);
    for (const nsp in this.nsps) {
      if (this.nsps.hasOwnProperty(nsp)) {
        this.nsps[nsp].emit(eventName, ...args);
      }
    }
  }

  /**
   * @description: 更新 Socket 的编码
   * @author: Quarter
   * @return
   */
  updateSocketIds(): void {
    for (const nsp in this.nsps) {
      if (Reflect.has(this.nsps, nsp)) {
        this.nsps[nsp].id = this.generateId(nsp);
      }
    }
  }

  /**
   * @description: 生成编码
   * @author: Quarter
   * @param {string} nsp 命名空间
   * @return {string}
   */
  generateId(nsp: string): string {
    return (nsp === "/" ? "" : (nsp + "#")) + this.engine.id;
  }

  /**
   * @description: 设置重连配置
   * @author: Quarter
   * @param {boolean} v 设置是否尝试重连
   * @return {Manager}
   */
  reconnection(v: boolean): Manager {
    this._reconnection = !!v;
    return this;
  }

  /**
   * @description: 设置最大重连次数
   * @author: Quarter
   * @param {number} v 最大重连次数
   * @return {Manager}
   */
  reconnectionAttempts(v: number): Manager {
    this._reconnectionAttempts = v;
    return this;
  }

  /**
   * @description: 设置重连延迟时间
   * @author: Quarter
   * @param {number} v 重连延迟时间
   * @return {Manager}
   */
  reconnectionDelay(v: number): Manager {
    this._reconnectionDelay = v;
    if (this.backoff) this.backoff.setMin(v);
    return this;
  }

  /**
   * @description: 设置随机因子
   * @author: Quarter
   * @param {number} v 随机因子
   * @return {Manager}
   */
  randomizationFactor(v: number): Manager {
    this._randomizationFactor = v;
    if (this.backoff) this.backoff.setJitter(v);
    return this;
  }

  /**
   * @description: 设置重连最大延迟
   * @author: Quarter
   * @param {number} v 最大延迟
   * @return {Manager}
   */
  reconnectionDelayMax(v: number): Manager {
    this._reconnectionDelayMax = v;
    if (this.backoff) this.backoff.setMax(v);
    return this;
  }

  /**
   * @description: 设置超时时间
   * @author: Quarter
   * @param {number|false} v 超时时间
   * @return {Manager}
   */
  timeout(v: number | false): Manager {
    this._timeout = v;
    return this;
  }

  /**
   * @description: 在打开时重连
   * @author: Quarter
   * @return
   */
  maybeReconnectOnOpen(): void {
    // Only try to reconnect if it's the first time we're connecting
    if (!this.reconnecting && this._reconnection && this.backoff.attempts === 0) {
      // keeps reconnection from firing twice for the same reconnection loop
      this.reconnect();
    }
  }

  /**
   * @description: 打开连接
   * @author: Quarter
   * @param {function} fn 回调函数
   * @return {Manager}
   */
  open(fn?: (err?: ManagerError) => void): Manager {
    return this._connect(fn);
  }

  /**
   * @description: 打开连接
   * @author: Quarter
   * @param {function} fn 回调函数
   * @return {Manager}
   */
  connect(fn?: (err?: ManagerError) => void): Manager {
    return this._connect(fn);
  }

  /**
   * @description: 连接逻辑
   * @author: Quarter
   * @param {function} fn 回调函数
   * @return {Manager}
   */
  _connect(fn?: (err?: ManagerError) => void): Manager {
    debug("readyState %s", this.readyState);
    if ("opening" === this.readyState || "open" === this.readyState) return this;

    debug("opening %s", this.uri);
    this.engine = new eio(this.uri, this.opts);
    const socket = this.engine;
    this.readyState = "opening";
    this.skipReconnect = false;

    // emit `open`
    const openSub = on(socket, "open", (): void => {
      this.onopen();
      if ("function" === typeof fn) fn();
    });

    // emit `connect_error`
    const errorSub = on(socket, "error", (data): void => {
      debug("connect_error");
      this.cleanup();
      this.readyState = "closed";
      this.emitAll("connect_error", data);
      if (fn) {
        const err = new ManagerError("Connection error", data);
        fn(err);
      } else {
        // Only do this if there is no fn to handle the error
        this.maybeReconnectOnOpen();
      }
    });

    // emit `connect_timeout`
    if (false !== this._timeout) {
      const timeout = this._timeout;
      debug("connect attempt will timeout after %d", timeout);

      if (timeout === 0) {
        openSub.destroy(); // prevents a race condition with the 'open' event
      }

      // set timer
      const timer = setTimeout(() => {
        debug("connect attempt timed out after %d", timeout);
        openSub.destroy();
        socket.close();
        socket.emit("error", "timeout");
        this.emitAll("connect_timeout", timeout);
      }, timeout);

      this.subs.push({
        destroy: () => {
          clearTimeout(timer);
        },
      });
    }

    this.subs.push(openSub);
    this.subs.push(errorSub);

    return this;
  }

  /**
   * @description: 打开回调逻辑
   * @author: Quarter
   * @return
   */
  onopen(): void {
    debug("open");

    // clear old subs
    this.cleanup();

    // mark as open
    this.readyState = "open";
    this.emit("open");

    // add new subs
    const socket = this.engine;
    this.subs.push(on(socket, "data", this.ondata, this));
    this.subs.push(on(socket, "ping", this.onping, this));
    this.subs.push(on(socket, "pong", this.onpong, this));
    this.subs.push(on(socket, "error", this.onerror, this));
    this.subs.push(on(socket, "close", this.onclose, this));
    this.subs.push(on(this.decoder, "decoded", this.ondecoded, this));
  }

  /**
   * @description: ping 回调逻辑
   * @author: Quarter
   * @return
   */
  onping(): void {
    this.lastPing = new Date();
    this.emitAll("ping");
  }

  /**
   * @description: pong 回调逻辑
   * @author: Quarter
   * @return
   */
  onpong(): void {
    if (this.lastPing instanceof Date) {
      this.emitAll("pong", new Date().getTime() - this.lastPing.getTime());
    }
  }

  /**
   * @description: 数据回调逻辑
   * @author: Quarter
   * @param {string|ArrayBuffer} data 数据
   * @return
   */
  ondata(data: string | ArrayBuffer): void {
    this.decoder.add(data);
  }

  /**
   * @description: 解码完成回调
   * @author: Quarter
   * @param {SocketIOPacket} packet 数据包
   * @return
   */
  ondecoded(packet: parser.SocketIOPacket): void {
    this.emit("packet", packet);
  }

  /**
   * @description: 错误回调逻辑
   * @author: Quarter
   * @param {string|Error} err 错误信息
   * @return
   */
  onerror(err?: string | Error): void {
    debug("error", err);
    this.emitAll("error", err);
  }

  /**
   * @description: 初始化 Socket 通道
   * @author: Quarter
   * @param {string} nsp 命名空间
   * @param {SocketOptions} opts Socket 配置
   * @return {Socket}
   */
  socket(nsp: string, opts: SocketOptions): Socket {
    let socket = this.nsps[nsp];
    if (!socket) {
      socket = new Socket(this, nsp, opts);
      this.nsps[nsp] = socket;

      const onConnecting = (): void => {
        if (!this.connecting.includes(socket)) {
          this.connecting.push(socket);
        }
      };
      socket.on("connecting", onConnecting, this);
      socket.on("connect", (): void => {
        socket.id = this.generateId(nsp);
      });

      if (this.autoConnect) {
        // manually call here since connecting event is fired before listening
        onConnecting();
      }
    }

    return socket;
  }

  /**
   * @description: 销毁 Socket 实例
   * @author: Quarter
   * @param {Socket} socket 隧道实例
   * @return
   */
  destroy(socket: Socket): void {
    const index = this.connecting.indexOf(socket);
    if (index >= 0) this.connecting.splice(index, 1);
    if (this.connecting.length) return;

    this.close();
  }

  /**
   * @description: 打包数据包
   * @author: Quarter
   * @param {SocketIOPacket} packet 数据包
   * @return
   */
  packet(packet: parser.SocketIOPacket): void {
    debug("writing packet %j", packet);
    if (packet.query && packet.type === 0) packet.nsp += "?" + packet.query;

    if (!this.encoding) {
      // encode, then write to engine with result
      this.encoding = true;
      this.encoder.encode(packet, (encodedPackets: (string | ArrayBuffer)[]): void => {
        for (const encodedPacket of encodedPackets) {
          this.engine.write(encodedPacket, packet.options);
        }
        this.encoding = false;
        this.processPacketQueue();
      });
    } else { // add packet to the queue
      this.packetBuffer.push(packet);
    }
  }

  /**
   * @description: 处理数据包队列
   * @author: Quarter
   * @return
   */
  processPacketQueue(): void {
    if (this.packetBuffer.length > 0 && !this.encoding) {
      const pack = this.packetBuffer.shift();
      if (pack) this.packet(pack);
    }
  }

  /**
   * @description: 清理
   * @author: Quarter
   * @return
   */
  cleanup(): void {
    debug("cleanup");

    const subsLength = this.subs.length;
    for (let i = 0; i < subsLength; i++) {
      const sub = this.subs.shift();
      if (sub) sub.destroy();
    }

    this.packetBuffer = [];
    this.encoding = false;
    this.lastPing = null;

    this.decoder.destroy();
  }

  /**
   * @description: 断开连接
   * @author: Quarter
   * @return
   */
  close(): void {
    this._disconnect();
  }

  /**
   * @description: 断开连接
   * @author: Quarter
   * @return
   */
  disconnect(): void {
    this._disconnect();
  }

  /**
   * @description: 断开连接具体逻辑
   * @author: Quarter
   * @return
   */
  _disconnect(): void {
    debug("disconnect");
    this.skipReconnect = true;
    this.reconnecting = false;
    if ("opening" === this.readyState) {
      // `onclose` will not fire because
      // an open event never happened
      this.cleanup();
    }
    this.backoff.reset();
    this.readyState = "closed";
    if (this.engine) this.engine.close();
  }

  /**
   * @description: 关闭回调处理逻辑
   * @author: Quarter
   * @param {string} reason 原因
   * @return
   */
  onclose(reason: string): void {
    debug("onclose");

    this.cleanup();
    this.backoff.reset();
    this.readyState = "closed";
    this.emit("close", reason);

    if (this._reconnection && !this.skipReconnect) {
      this.reconnect();
    }
  }

  /**
   * @description: 重连逻辑
   * @author: Quarter
   * @return
   */
  reconnect(): void {
    if (this.reconnecting || this.skipReconnect) return;

    if (this.backoff.attempts >= this._reconnectionAttempts) {
      debug("reconnect failed");
      this.backoff.reset();
      this.emitAll("reconnect_failed");
      this.reconnecting = false;
    } else {
      const delay = this.backoff.duration();
      debug("will wait %dms before reconnect attempt", delay);

      this.reconnecting = true;
      const timer = setTimeout(() => {
        if (this.skipReconnect) return;

        debug("attempting reconnect");
        this.emitAll("reconnect_attempt", this.backoff.attempts);
        this.emitAll("reconnecting", this.backoff.attempts);

        // check again for the case socket closed in above events
        if (this.skipReconnect) return;

        this.open((err?: ManagerError): void => {
          if (err) {
            debug("reconnect attempt error");
            this.reconnecting = false;
            this.reconnect();
            this.emitAll("reconnect_error", err.data);
          } else {
            debug("reconnect success");
            this.onreconnect();
          }
        });
      }, delay);

      this.subs.push({
        destroy: () => {
          clearTimeout(timer);
        },
      });
    }
  }

  /**
   * @description: 重连成功回调逻辑
   * @author: Quarter
   * @return
   */
  onreconnect(): void {
    const attempt = this.backoff.attempts;
    this.reconnecting = false;
    this.backoff.reset();
    this.updateSocketIds();
    this.emitAll("reconnect", attempt);
  }
}