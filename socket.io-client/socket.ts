/*
 * @Author: Quarter
 * @Date: 2022-04-27 03:43:09
 * @LastEditTime: 2022-05-06 00:49:22
 * @LastEditors: Quarter
 * @Description: socket 模块
 * @FilePath: /socket.io-client/socket.io-client/socket.ts
 */

import Debug from "debug";
import { Manager } from "./manager";
import on from "./on";
import { Emitter, hasBinary, parseqs } from "utils";
import { ACK, BINARY_ACK, BINARY_EVENT, CONNECT, DISCONNECT, ERROR, EVENT, SocketIOPacket } from "socket.io-parser";

const debug = Debug("socket.io-client:socket");

export interface SocketOptions {
  query?: string | { [key: string | number]: string | number | boolean };
}

/**
 * Internal events (blacklisted).
 * These events can"t be emitted by the user.
 *
 * @api private
 */

const events = {
  connect: 1,
  connect_error: 1,
  connect_timeout: 1,
  connecting: 1,
  disconnect: 1,
  error: 1,
  reconnect: 1,
  reconnect_attempt: 1,
  reconnect_failed: 1,
  reconnect_error: 1,
  reconnecting: 1,
  ping: 1,
  pong: 1,
};

export class Socket extends Emitter {
  constructor(io: Manager, nsp: string, opts: SocketOptions) {
    super();

    this.io = io;
    this.nsp = nsp;
    this.ids = 0;
    this.acks = {};
    this.receiveBuffer = [];
    this.sendBuffer = [];
    this.connected = false;
    this.disconnected = true;
    if (opts && opts.query) {
      this.query = opts.query;
    }
    if (this.io.autoConnect) this.open();
  }

  io!: Manager;
  id: number | string = 0;
  nsp = "/";
  ids = 0;
  acks: { [id: number]: () => void } = {};
  json = this;
  receiveBuffer: any[] = [];
  sendBuffer: SocketIOPacket[] = [];
  connected = false;
  disconnected = true;
  query = {};
  subs: ReturnType<typeof on>[] = []; // 订阅事件
  flags = {
    compress: false, // 是否压缩
    binary: false, // 是否二进制
  };

  /**
   * @description: 订阅事件
   * @author: Quarter
   * @return
   */
  subEvents(): void {
    if (this.subs.length > 0) return;

    const io = this.io;
    this.subs = [
      on(io, "open", this.onopen, this),
      on(io, "packet", this.onpacket, this),
      on(io, "close", this.onclose, this),
    ];
  }

  /**
   * @description: 打开连接
   * @author: Quarter
   * @return {Socket}
   */
  open(): Socket {
    if (this.connected) return this;

    this.subEvents();
    if (!this.io.reconnecting) this.io.open(); // ensure open
    if ("open" === this.io.readyState) this.onopen();
    this.emit("connecting");
    return this;
  }

  /**
   * @description: 打开连接
   * @author: Quarter
   * @return {Socket}
   */
  connect(): Socket {
    if (this.connected) return this;

    this.subEvents();
    if (!this.io.reconnecting) this.io.open(); // ensure open
    if ("open" === this.io.readyState) this.onopen();
    this.emit("connecting");
    return this;
  }

  /**
   * @description: 发送数据
   * @author: Quarter
   * @param {array} args
   * @return {Socket}
   */
  send(...args: any[]): Socket {
    this.emit("message", ...args);
    return this;
  }

  /**
   * @description: 触发事件
   * @author: Quarter
   * @param {string} ev 事件名
   * @return {Socket}
   */
  emit(ev: string, ...args: any[]): Socket {
    if (events.hasOwnProperty(ev)) {
      super.emit(ev, ...args);
      return this;
    }
    const packet: SocketIOPacket = {
      id: 0,
      type: (this.flags.binary !== undefined ? this.flags.binary : hasBinary(args)) ? BINARY_EVENT : EVENT,
      data: args,
      nsp: this.nsp,
      attachments: 0,
    };

    packet.options = {};
    packet.options.compress = !this.flags || false !== this.flags.compress;

    // event ack callback
    if ("function" === typeof args[args.length - 1]) {
      debug("emitting packet with ack id %d", this.ids);
      this.acks[this.ids] = args.pop();
      packet.id = this.ids++;
    }

    if (this.connected) {
      this.packet(packet);
    } else {
      this.sendBuffer.push(packet);
    }

    this.flags = {
      compress: false,
      binary: false,
    };

    return this;
  }

  /**
   * @description: 打包传输包
   * @author: Quarter
   * @param {SocketIOPacket} packet 数据包
   * @return
   */
  packet(packet: SocketIOPacket): void {
    packet.nsp = this.nsp;
    this.io.packet(packet);
  }

  /**
   * @description: 打开回调逻辑
   * @author: Quarter
   * @return
   */
  onopen(): void {
    debug("transport is open - connecting");

    // write connect packet if necessary
    if ("/" !== this.nsp) {
      if (this.query) {
        const query = typeof this.query === "object" ? parseqs.encode(this.query) : this.query;
        debug("sending connect packet with query %s", query);
        this.packet({ type: CONNECT, data: null, id: 0, query, });
      } else {
        this.packet({ type: CONNECT, data: null, id: 0, });
      }
    }
  }

  /**
   * @description: 关闭回调逻辑
   * @author: Quarter
   * @param {string} reason 原因
   * @return
   */
  onclose(reason: string): void {
    debug("close (%s)", reason);
    this.connected = false;
    this.disconnected = true;
    this.id = 0;
    this.emit("disconnect", reason);
  }

  /**
   * @description: 打包回调
   * @author: Quarter
   * @param {SocketIOPacket} packet 数据包
   * @return
   */
  onpacket(packet: SocketIOPacket): void {
    const sameNamespace = packet.nsp === this.nsp;
    const rootNamespaceError = packet.type === ERROR && packet.nsp === "/";

    if (!sameNamespace && !rootNamespaceError) return;

    switch (packet.type) {
      case CONNECT:
        this.onconnect();
        break;

      case EVENT:
        this.onevent(packet);
        break;

      case BINARY_EVENT:
        this.onevent(packet);
        break;

      case ACK:
        this.onack(packet);
        break;

      case BINARY_ACK:
        this.onack(packet);
        break;

      case DISCONNECT:
        this.ondisconnect();
        break;

      case ERROR:
        this.emit("error", packet.data);
        break;
    }
  }

  /**
   * @description: 事件回调
   * @author: Quarter
   * @param {SocketIOPacket} packet 数据包
   * @return
   */
  onevent(packet: SocketIOPacket): void {
    const args = packet.data || [];
    debug("emitting event %j", args);

    if (0 !== packet.id) {
      debug("attaching ack callback to event");
      args.push(this.ack(packet.id));
    }

    if (this.connected) {
      // @ts-ignore
      super.emit(...args);
    } else {
      this.receiveBuffer.push(args);
    }
  }

  /**
   * @description: 确认实现逻辑
   * @author: Quarter
   * @param {number} id 编号
   * @return {function}
   */
  ack(id: number, ...args: any[]): () => void {
    let sent = false;
    return () => {
      // prevent double callbacks
      if (sent) return;
      sent = true;
      debug("sending ack %j", [id, ...args]);

      this.packet({
        type: hasBinary(args) ? BINARY_ACK : ACK,
        id,
        data: args,
      });
    };
  }

  /**
   * @description: 确认回调逻辑
   * @author: Quarter
   * @param {SocketIOPacket} packet 数据包
   * @return
   */
  onack(packet: SocketIOPacket): void {
    const ack = this.acks[packet.id];
    if ("function" === typeof ack) {
      debug("calling ack %s with %j", packet.id, packet.data);
      ack.apply(this, packet.data);
      delete this.acks[packet.id];
    } else {
      debug("bad ack %s", packet.id);
    }
  }

  /**
   * @description: 连接回调
   * @author: Quarter
   * @return
   */
  onconnect(): void {
    this.connected = true;
    this.disconnected = false;
    this.emit("connect");
    this.emitBuffered();
  }

  /**
   * @description: 触发缓冲区处理
   * @author: Quarter
   * @return
   */
  emitBuffered(): void {
    for (const receiveBuffer of this.receiveBuffer) {
      // @ts-ignore
      super.emit(...receiveBuffer);
    }
    this.receiveBuffer = [];

    for (const sendBuffer of this.sendBuffer) {
      this.packet(sendBuffer);
    }
    this.sendBuffer = [];
  }

  /**
   * @description: 断开连接回调逻辑
   * @author: Quarter
   * @return
   */
  ondisconnect(): void {
    debug("server disconnect (%s)", this.nsp);
    this.destroy();
    this.onclose("io server disconnect");
  }

  /**
   * @description: 销毁实例
   * @author: Quarter
   * @return
   */
  destroy(): void {
    if (this.subs) {
      this.subs.forEach((sub) => {
        sub.destroy();
      });
      this.subs = [];
    }

    this.io.destroy(this);
  }

  /**
   * @description: 关闭连接
   * @author: Quarter
   * @return {Socket}
   */
  close(): Socket {
    if (this.connected) {
      debug("performing disconnect (%s)", this.nsp);
      this.packet({ type: DISCONNECT, data: null, id: 0 });
    }

    // remove socket from pool
    this.destroy();

    if (this.connected) {
      // fire events
      this.onclose("io client disconnect");
    }
    return this;
  }

  /**
   * @description: 关闭连接
   * @author: Quarter
   * @return {Socket}
   */
  disconnect(): Socket {
    if (this.connected) {
      debug("performing disconnect (%s)", this.nsp);
      this.packet({ type: DISCONNECT, id: 0, data: null });
    }

    // remove socket from pool
    this.destroy();

    if (this.connected) {
      // fire events
      this.onclose("io client disconnect");
    }
    return this;
  }

  /**
   * @description: 设置是否压缩标记位
   * @author: Quarter
   * @param {boolean} compress 是否压缩
   * @return {Socket}
   */
  compress(compress: boolean): Socket {
    this.flags.compress = compress;
    return this;
  }

  /**
   * @description: 设置二进制标记为
   * @author: Quarter
   * @param {boolean} binary 是否二进制
   * @return {Socket}
   */
  binary(binary: boolean): Socket {
    this.flags.binary = binary;
    return this;
  }
}
