/*
 * @Author: Quarter
 * @Date: 2022-05-04 01:23:27
 * @LastEditTime: 2022-05-05 13:10:15
 * @LastEditors: Quarter
 * @Description: 解码器
 * @FilePath: /socket.io-client/socket.io-parser/decoder.ts
 */

import BinaryReconstructor from "./binary-reconstructor";
import Debug from "debug";
import { Emitter, isArray } from "utils";
import { BINARY_ACK, BINARY_EVENT, ERROR, type SocketIOPacket, types } from ".";

const debug = Debug("socket.io-parser");

/**
 * @description: 构造错误数据包
 * @author: Quarter
 * @param {string} msg 消息内容
 * @return {SocketIOPacket}
 */
const error = (msg: string): SocketIOPacket => {
  return {
    attachments: 0,
    data: "parser error: " + msg,
    id: 0,
    nsp: "/",
    type: ERROR,
  };
};


/**
 * @description: 尝试解析 JSON 数据
 * @author: Quarter
 * @param {string} str 字符串
 * @return {object|boolean}
 */
const tryParse = (str: string): any => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return false;
  }
};

/**
 * @description: 解码字符串数据
 * @author: Quarter
 * @param {string} str 字符串
 * @return {SocketIOPacket}
 */
const decodeString = (str: string): SocketIOPacket => {
  let i = 0;
  const p: SocketIOPacket = {
    attachments: 0,
    data: "",
    id: 0,
    nsp: "/",
    type: 4,
  };
  const type = Number(str.charAt(0));
  // 包类型鉴别
  if (undefined !== types[type]) {
    p.type = type;
  } else {
    return error("unknown packet type " + type);
  }

  // 如果类型为二进制数据，转换为附件
  if (BINARY_EVENT === p.type || BINARY_ACK === p.type) {
    const start = i + 1;
    i++;
    while (str.charAt(i) !== "-" && i !== str.length) {
      i++;
    }
    const buf = str.substring(start, i);
    if (buf !== Number(buf).toString() || str.charAt(i) !== "-") {
      throw new Error("Illegal attachments");
    }
    p.attachments = Number(buf);
  }

  // 获取命名空间
  if ("/" === str.charAt(i + 1)) {
    const start = i + 1;
    while (++i) {
      const c = str.charAt(i);
      if ("," === c) break;
      if (i === str.length) break;
    }
    p.nsp = str.substring(start, i);
  } else {
    p.nsp = "/";
  }

  // 获取 id
  const next = str.charAt(i + 1);
  if ("" !== next && Number(next).toString() === next) {
    const start = i + 1;
    while (++i) {
      const c = str.charAt(i);
      if (null === c || Number(c).toString() !== c) {
        --i;
        break;
      }
      if (i === str.length) break;
    }
    p.id = Number(str.substring(start, i + 1));
  }

  // 获取 json 数据
  if (str.charAt(++i)) {
    const payload = tryParse(str.substring(i));
    const isPayloadValid = payload !== false && (p.type === ERROR || isArray(payload));
    if (isPayloadValid) {
      p.data = payload;
    } else {
      return error("invalid payload");
    }
  }

  debug("decoded %s as %j", str, p);
  return p;
};


export class Decoder extends Emitter {
  constructor() {
    super();
    this.reconstructor = null;
  }

  // 构造器
  reconstructor: BinaryReconstructor | null = null;

  /**
   * @description: 添加数据
   * @author: Quarter
   * @param {string|ArrayBuffer} obj 数据
   * @return
   */
  add(obj: string | ArrayBuffer): void {
    let packet: SocketIOPacket | null = null;
    if (typeof obj === "string") {
      packet = decodeString(obj);
      if (BINARY_EVENT === packet.type || BINARY_ACK === packet.type) { // binary packet's json
        this.reconstructor = new BinaryReconstructor(packet);

        // no attachments, labeled binary but no binary data to follow
        if (this.reconstructor.reconPack?.attachments === 0) {
          this.emit("decoded", packet);
        }
      } else { // non-binary full packet
        this.emit("decoded", packet);
      }
    } else if (obj instanceof ArrayBuffer) {
      // 二进制数据
      if (!this.reconstructor) {
        throw new Error("got binary data when not reconstructing a packet");
      } else {
        packet = this.reconstructor.takeBinaryData(obj);
        if (packet) { // received final buffer
          this.reconstructor = null;
          this.emit("decoded", packet);
        }
      }
    } else {
      throw new Error("Unknown type: " + obj);
    }
  }

  /**
   * @description: 销毁
   * @author: Quarter
   * @return
   */
  destroy(): void {
    if (this.reconstructor) {
      this.reconstructor.finishedReconstruction();
    }
  }
}