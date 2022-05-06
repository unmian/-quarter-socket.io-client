/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:15
 * @LastEditTime: 2022-05-06 03:14:19
 * @LastEditors: Quarter
 * @Description: Socket 模块
 * @FilePath: /socket.io-client/engine.io-client/socket.ts
 */

import Debug from "debug";
import * as parser from "engine.io-parser";
import { Emitter, parseuri, parseqs } from "utils";
import Transport from "./transport";
import * as transports from "./transports";

const debug = Debug("engine.io-client:socket");

type SocketTransportType = "polling" | "websocket";
type ReadyState = "opening" | "open" | "closing" | "closed" | "";

interface NormalObject {
  [key: string | number]: any;
}

export interface EngineSocketOptions {
  agent?: boolean;
  enablesXDR?: boolean;
  extraHeaders?: NormalObject;
  forceBase64?: boolean;
  forceJSONP?: boolean;
  hostname?: string;
  jsonp?: boolean;
  onlyBinaryUpgrades?: boolean;
  path?: string;
  perMessageDeflate?: {
    threshold?: number;
  } | boolean;
  port?: string | number;
  query?: string | { [key: string]: string };
  rememberUpgrade?: boolean;
  secure?: boolean;
  timestampParam?: string;
  timestampRequests?: boolean;
  transports?: SocketTransportType[];
  transportOptions?: {};
  upgrade?: boolean;
  withCredentials?: boolean;
}

interface SocketTransportOption {
  polling?: NormalObject;
  websocket?: NormalObject;
}

/**
 * @description: 对象克隆
 * @author: Quarter
 * @param {NormalObject} obj 对象
 * @return {NormalObject}
 */
const clone = <T extends NormalObject>(obj: T): T => {
  const o: NormalObject = {};
  for (const i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = obj[i];
    }
  }
  return o as T;
};

class Socket extends Emitter {
  /**
   * @description: 构造函数
   * @author: Quarter
   * @param {string} uri 地址
   * @param {EngineSocketOptions} opts 配置项
   * @return
   */
  constructor(uri: string, opts: EngineSocketOptions = {}) {
    super();

    if (uri) {
      const result = parseuri(uri);
      opts.hostname = result.host;
      opts.secure = result.protocol === "https" || result.protocol === "wss";
      opts.port = result.port;
      if (result.query) opts.query = result.query;
    }

    this.secure = "boolean" === typeof opts.secure ? opts.secure
      : (typeof location !== "undefined" && "https:" === location.protocol);

    if (opts.hostname && !opts.port) {
      // if no port is specified manually, use the protocol default
      opts.port = this.secure ? "443" : "80";
    }

    this.agent = opts.agent || false;
    this.hostname = opts.hostname ||
      (typeof location !== "undefined" ? location.hostname : "localhost");
    this.port = opts.port || (typeof location !== "undefined" && location.port
      ? location.port
      : (this.secure ? 443 : 80));
    this.query = "string" === typeof opts.query ? {} : opts.query || {};
    if ("string" === typeof this.query) this.query = parseqs.decode(this.query);
    this.upgrade = false !== opts.upgrade;
    this.path = (opts.path || "/engine.io").replace(/\/$/, "") + "/";
    this.forceJSONP = !!opts.forceJSONP;
    this.jsonp = false !== opts.jsonp;
    this.forceBase64 = !!opts.forceBase64;
    this.enablesXDR = !!opts.enablesXDR;
    this.withCredentials = false !== opts.withCredentials;
    this.timestampParam = opts.timestampParam || "t";
    this.timestampRequests = !!opts.timestampRequests;
    this.transports = opts.transports || ["polling", "websocket"];
    this.transportOptions = opts.transportOptions || {};
    this.readyState = "";
    this.writeBuffer = [];
    this.prevBufferLen = 0;
    this.rememberUpgrade = opts.rememberUpgrade || false;
    this.onlyBinaryUpgrades = !!opts.onlyBinaryUpgrades;
    this.perMessageDeflate = "boolean" === typeof opts.perMessageDeflate ? {} : (opts.perMessageDeflate || {});
    if (this.perMessageDeflate && "number" !== typeof this.perMessageDeflate.threshold) {
      this.perMessageDeflate.threshold = 1024;
    }

    // detect ReactNative environment
    this.isReactNative = (typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative");

    this.open();
  }

  agent: boolean = false;
  enablesXDR = false;
  extraHeaders: NormalObject | undefined = undefined;
  forceBase64 = false;
  forceJSONP = false;
  hostname: string = "";
  id = null;
  isReactNative = false;
  jsonp = false;
  onlyBinaryUpgrades = false;
  path: string = "/engine.io";
  parser = parser;
  perMessageDeflate: {
    threshold?: number;
  } = {};
  pingInterval = 3000;
  pingTimeout = 3000;
  pingIntervalTimer: NodeJS.Timeout | null = null;
  pingTimeoutTimer: NodeJS.Timeout | null = null;
  port: string | number = 80;
  prevBufferLen = 0;
  priorWebsocketSuccess = false;
  protocol = parser.protocol;
  query: { [key: string]: string | number } = {};
  readyState: ReadyState = "";
  rememberUpgrade = false;
  requestTimeout = 3000;
  secure = false;
  Socket = Socket;
  supportsBinary = false; // 是否支持二进制
  timestampParam = "t";
  timestampRequests = false;
  Transport = null;
  transport: Transport | null = null;
  transports: SocketTransportType[] = ["polling", "websocket"];
  transportOptions: SocketTransportOption = {};
  upgrade = false;
  upgrading = false;
  upgrades: SocketTransportType[] = [];
  withCredentials = false;
  writeBuffer: parser.TransportPacket[] = [];

  /**
   * @description: 打开连接
   * @author: Quarter
   * @return
   */
  open() {
    let transportProtocal: SocketTransportType;
    if (this.rememberUpgrade && this.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1) {
      transportProtocal = "websocket";
    } else if (0 === this.transports.length) {
      // Emit error on next tick so it can be listened to
      setTimeout(() => {
        this.emit("error", "No transports available");
      }, 0);
      return;
    } else {
      transportProtocal = this.transports[0];
    }
    this.readyState = "opening";

    // Retry with the next transport if the transport is disabled (jsonp: false)
    let transport!: Transport;
    console.log(123, "transportProtocal", transportProtocal);
    try {
      transport = this.createTransport(transportProtocal);
    } catch (e) {
      this.transports.shift();
      this.open();
      return;
    }

    transport.open();
    this.setTransport(transport);
  }

  /**
   * @description: 创建传输渠道
   * @author: Quarter
   * @param {SocketTransportType} name 传输协议
   * @return {Transport}
   */
  createTransport(name: SocketTransportType): Transport {
    debug(`creating transport "%s"`, name);
    const query = clone(this.query);

    // append engine.io protocol identifier
    query.EIO = parser.protocol;

    // transport name
    query.transport = name;

    // per-transport options
    const options = this.transportOptions[name] || {};

    // session id if we already have one
    if (this.id) query.sid = this.id;
    // @ts-ignore
    const transport = transports[name]({
      query,
      socket: this,
      agent: options.agent || this.agent,
      hostname: options.hostname || this.hostname,
      port: options.port || this.port,
      secure: options.secure || this.secure,
      path: options.path || this.path,
      forceJSONP: options.forceJSONP || this.forceJSONP,
      jsonp: options.jsonp || this.jsonp,
      forceBase64: options.forceBase64 || this.forceBase64,
      enablesXDR: options.enablesXDR || this.enablesXDR,
      withCredentials: options.withCredentials || this.withCredentials,
      timestampRequests: options.timestampRequests || this.timestampRequests,
      timestampParam: options.timestampParam || this.timestampParam,
      perMessageDeflate: options.perMessageDeflate || this.perMessageDeflate,
      extraHeaders: options.extraHeaders || this.extraHeaders,
      requestTimeout: options.requestTimeout || this.requestTimeout,
      protocols: options.protocols || void (0),
      isReactNative: this.isReactNative,
    });

    return transport;
  }

  /**
   * @description: 设置传输通道
   * @author: Quarter
   * @param {Transport} transport 传输通道
   * @return
   */
  setTransport(transport: Transport): void {
    debug("setting transport %s", transport.name);

    if (this.transport) {
      debug("clearing existing transport %s", this.transport.name);
      this.transport.removeAllListeners();
    }

    // set up transport
    this.transport = transport;

    // set up transport listeners
    transport
      .on("drain", this.onDrain, this)
      .on("packet", this.onPacket, this)
      .on("error", this.onError, this)
      .on("close", () => this.onClose("transport close"));
  }

  /**
   * @description: 探测
   * @author: Quarter
   * @param {SocketTransportType} name 名称
   * @return
   */
  probe(name: SocketTransportType): void {
    debug(`probing transport "%s"`, name);
    const transport = this.createTransport(name);
    let failed = false;

    this.priorWebsocketSuccess = false;

    const onTransportOpen = (): void => {
      if (this.onlyBinaryUpgrades) {
        const upgradeLosesBinary = !this.supportsBinary && this.transport?.supportsBinary;
        failed = failed || !!upgradeLosesBinary;
      }
      if (failed) return;

      debug(`probe transport "%s" opened`, name);
      transport.send([{ type: "ping", data: "probe" }]);
      transport.once("packet", (msg) => {
        if (failed) return;
        if ("pong" === msg.type && "probe" === msg.data) {
          debug(`probe transport "%s" pong`, name);
          this.upgrading = true;
          this.emit("upgrading", transport);
          if (!transport) return;
          this.priorWebsocketSuccess = "websocket" === transport.name;

          debug(`pausing current transport "%s"`, this.transport?.name);
          this.transport?.pause((): void => {
            if (failed) return;
            if ("closed" === this.readyState) return;
            debug("changing transport and sending upgrade packet");

            cleanup();

            this.setTransport(transport);
            transport.send([{ type: "upgrade", data: "" }]);
            this.emit("upgrade", transport);
            this.upgrading = false;
            this.flush();
          });
        } else {
          debug(`probe transport "%s" failed`, name);
          const err = new Error("probe error");
          // err.transport = transport.name;
          this.emit("upgradeError", err);
        }
      });
    };

    /**
     * @description: 冻结传输
     * @author: Quarter
     * @return
     */
    const freezeTransport = (): void => {
      if (failed) return;

      // Any callback called by transport should be ignored since now
      failed = true;

      cleanup();

      transport.close();
    };

    /**
     * @description: 错误回调处理
     * @author: Quarter
     * @param {string} err 错误内容
     * @return
     */
    const onerror = (err: string): void => {
      const error = new Error("probe error: " + err);
      // error.transport = transport.name;

      freezeTransport();

      debug(`probe transport "%s" failed because of error: %s`, name, err);

      this.emit("upgradeError", error);
    };

    /**
     * @description: 处理传输关闭回调
     * @author: Quarter
     * @return
     */
    const onTransportClose = (): void => {
      onerror("transport closed");
    };

    /**
     * @description: 处理关闭回调
     * @author: Quarter
     * @return
     */
    const onclose = (): void => {
      onerror("socket closed");
    };

    /**
     * @description: 更新回调
     * @author: Quarter
     * @param {Transport} to 前往更新
     * @return
     */
    const onupgrade = (to: Transport): void => {
      if (transport && to.name !== transport.name) {
        debug(`"%s" works - aborting "%s"`, to.name, transport.name);
        freezeTransport();
      }
    };

    /**
     * @description: 清理事件监听
     * @author: Quarter
     * @return
     */
    const cleanup = (): void => {
      transport.removeEventListener("open", onTransportOpen);
      transport.removeEventListener("error", onerror);
      transport.removeEventListener("close", onTransportClose);
      this.removeEventListener("close", onclose);
      this.removeEventListener("upgrading", onupgrade);
    };

    transport.once("open", onTransportOpen);
    transport.once("error", onerror);
    transport.once("close", onTransportClose);

    this.once("close", onclose);
    this.once("upgrading", onupgrade);

    transport.open();
  }

  /**
   * @description: 连接打开回调
   * @author: Quarter
   * @return
   */
  onOpen(): void {
    debug("socket open");
    this.readyState = "open";
    this.priorWebsocketSuccess = "websocket" === this.transport?.name;
    this.emit("open");
    this.flush();

    if ("open" === this.readyState && this.upgrade && this.transport?.pause) {
      debug("starting upgrade probes");
      console.log(123, "starting upgrade probes", this.upgrades,);
      for (let i = 0, l = this.upgrades.length; i < l; i++) {
        this.probe(this.upgrades[i]);
      }
    }
  }

  /**
   * @description: 数据包回调处理
   * @author: Quarter
   * @param {TransportPacket} packet 数据包
   * @return
   */
  onPacket(packet: parser.TransportPacket): void {
    if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
      debug(`socket receive: type "%s", data "%s"`, packet.type, packet.data);

      this.emit("packet", packet);

      this.emit("heartbeat");

      switch (packet.type) {
        case "open":
          this.onHandshake(JSON.parse(packet.data.toString()));
          break;

        case "pong":
          this.setPing();
          this.emit("pong");
          break;

        case "error":
          const err = new Error("server error");
          // err.code = packet.data;
          this.onError(err);
          break;

        case "message":
          this.emit("data", packet.data);
          this.emit("message", packet.data);
          break;
      }
    } else {
      debug(`packet received with socket readyState "%s"`, this.readyState);
    }
  }

  /**
   * @description: 握手回调处理
   * @author: Quarter
   * @param {NormalObject} data 对象
   * @return
   */
  onHandshake(data: NormalObject): void {
    console.log("on-hand-shake", this.readyState, data);
    this.emit("handshake", data);
    this.id = data.sid;
    if (this.transport?.query) this.transport.query.sid = data.sid;
    this.upgrades = this.filterUpgrades(data.upgrades);
    this.pingInterval = data.pingInterval;
    this.pingTimeout = data.pingTimeout;
    this.onOpen();
    // In case open handler closes socket
    if ("closed" === this.readyState) return;
    this.setPing();

    // Prolong liveness of socket on heartbeat
    this.removeEventListener("heartbeat", this.onHeartbeat);
    this.on("heartbeat", this.onHeartbeat, this);
  }

  /**
   * @description: 心跳回调
   * @author: Quarter
   * @param {number} timeout 计时时间
   * @return
   */
  onHeartbeat(timeout: number): void {
    if (this.pingTimeoutTimer) clearTimeout(this.pingTimeoutTimer);
    this.pingTimeoutTimer = setTimeout(() => {
      if ("closed" === this.readyState) return;
      this.onClose("ping timeout");
    }, timeout || (this.pingInterval + this.pingTimeout));
  }

  /**
   * @description: 设置 ping
   * @author: Quarter
   * @return
   */
  setPing(): void {
    if (this.pingIntervalTimer) clearTimeout(this.pingIntervalTimer);
    this.pingIntervalTimer = setTimeout(() => {
      debug("writing ping packet - expecting pong within %sms", this.pingTimeout);
      this.ping();
      this.onHeartbeat(this.pingTimeout);
    }, this.pingInterval);
  }

  /**
   * @description: ping
   * @author: Quarter
   * @return
   */
  ping(): void {
    this.sendPacket("ping", () => this.emit("ping"));
  }

  /**
   * @description: drain 回调处理
   * @author: Quarter
   * @return
   */
  onDrain(): void {
    this.writeBuffer.splice(0, this.prevBufferLen);

    // setting prevBufferLen = 0 is very important
    // for example, when upgrading, upgrade packet is sent over,
    // and a nonzero prevBufferLen could cause problems on `drain`
    this.prevBufferLen = 0;

    if (0 === this.writeBuffer.length) {
      this.emit("drain");
    } else {
      this.flush();
    }
  }

  /**
   * @description: 刷新状态
   * @author: Quarter
   * @return
   */
  flush(): void {
    if ("closed" !== this.readyState && this.transport?.writable &&
      !this.upgrading && this.writeBuffer.length) {
      debug("flushing %d packets in socket", this.writeBuffer.length);
      this.transport.send(this.writeBuffer);
      // keep track of current length of writeBuffer
      // splice writeBuffer and callbackBuffer on `drain`
      this.prevBufferLen = this.writeBuffer.length;
      this.emit("flush");
    }
  }

  /**
   * @description: 数据写入
   * @author: Quarter
   * @param {string|ArrayBuffer} msg 数据内容
   * @return {Socket}
   */
  write(msg: string | ArrayBuffer, ...args: any[]): Socket {
    this.sendPacket("message", msg, ...args);
    return this;
  }

  /**
   * @description: 发送数据包
   * @author: Quarter
   * @param {string} msg 数据内容
   * @return {Socket}
   */
  send(msg: string, ...args: any[]): Socket {
    this.sendPacket("message", msg, ...args);
    return this;
  }

  /**
   * @description: 发送数据包
   * @author: Quarter
   * @param {PacketType} type 数据包类型
   * @param {*} args 其它参数
   * @return
   */
  sendPacket(type: parser.PacketType, ...args: any[]): void {
    let data: string | ArrayBuffer = "";
    let options: parser.TransportPacketOptions = {};
    let fn!: (str: string) => void;
    if (args.length >= 3) {
      data = args[0];
      options = args[1];
      fn = args[2];
    } else if (args.length >= 2) {
      data = args[0];
      fn = args[1];
    } else if (args.length >= 1) {
      fn = args[0];
    }

    if ("closing" === this.readyState || "closed" === this.readyState) {
      return;
    }

    options = options || {};
    options.compress = false !== options.compress;

    const packet: parser.TransportPacket = {
      type,
      data,
      options,
    };
    this.emit("packetCreate", packet);
    this.writeBuffer.push(packet);
    if ("function" === typeof fn) this.once("flush", fn);
    this.flush();
  }

  /**
   * @description: 关闭
   * @author: Quarter
   * @return
   */
  close(): Socket {
    if ("opening" === this.readyState || "open" === this.readyState) {
      this.readyState = "closing";

      const close = (): void => {
        this.onClose("forced close");
        debug("socket closing - telling transport to close");
        this.transport?.close();
      };

      const cleanupAndClose = (): void => {
        this.removeEventListener("upgrade", cleanupAndClose);
        this.removeEventListener("upgradeError", cleanupAndClose);
        close();
      };

      const waitForUpgrade = (): void => {
        // wait for upgrade to finish since we can"t send packets while pausing a transport
        this.once("upgrade", cleanupAndClose);
        this.once("upgradeError", cleanupAndClose);
      };

      if (this.writeBuffer.length) {
        this.once("drain", () => {
          if (this.upgrading) {
            waitForUpgrade();
          } else {
            close();
          }
        });
      } else if (this.upgrading) {
        waitForUpgrade();
      } else {
        close();
      }
    }

    return this;
  }

  /**
   * @description: 错误回调处理
   * @author: Quarter
   * @param {string|Error} err 错误
   * @return
   */
  onError(err: string | Error): void {
    debug("socket error %j", err);
    this.priorWebsocketSuccess = false;
    this.emit("error", err);
    this.onClose("transport error", err.toString());
  }

  /**
   * @description: 关闭回调处理
   * @author: Quarter
   * @param {string} reason 原因
   * @param {string} desc 描述
   * @return
   */
  onClose(reason: string, desc?: string): void {
    if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
      debug(`socket close with reason: "%s"`, reason);

      // clear timers
      if (this.pingIntervalTimer) clearTimeout(this.pingIntervalTimer);
      if (this.pingTimeoutTimer) clearTimeout(this.pingTimeoutTimer);

      // stop event from firing again for transport
      this.transport?.removeListener("close");

      // ensure transport won"t stay open
      this.transport?.close();

      // ignore further transport communication
      this.transport?.removeAllListeners();

      // set ready state
      this.readyState = "closed";

      // clear session id
      this.id = null;

      // emit close event
      this.emit("close", reason, desc);

      // clean buffers after, so users can still
      // grab the buffers on `close` event
      this.writeBuffer = [];
      this.prevBufferLen = 0;
    }
  }

  /**
   * @description: 过滤更新
   * @author: Quarter
   * @param {SocketTransportType[]} upgrades socket类型
   * @return {SocketTransportType[]}
   */
  filterUpgrades(upgrades: SocketTransportType[]): SocketTransportType[] {
    const filteredUpgrades: SocketTransportType[] = [];
    for (const upgrade of upgrades) {
      if (this.transports.includes(upgrade)) filteredUpgrades.push(upgrade);
    }
    console.log(123, "filterUpgrades", filteredUpgrades);
    return filteredUpgrades;
  }
}

export default Socket;