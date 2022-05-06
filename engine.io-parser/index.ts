/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:28:41
 * @LastEditTime: 2022-05-06 02:32:05
 * @LastEditors: Quarter
 * @Description: 入口文件
 * @FilePath: /socket.io-client/engine.io-parser/index.ts
 */
import { after, AfterCallback, hasBinary, keys, utf8 } from "utils";

export type PacketType = "open" | "close" | "ping" | "pong" | "message" | "upgrade" | "noop" | "error";
export interface TransportPacketOptions {
  compress?: boolean; // 是否压缩
}
export interface TransportPacket {
  type: PacketType; // 类型
  data: ArrayBuffer | string; // 数据
  options?: TransportPacketOptions; // 配置项
  attachments?: number; // 附件数量
}

// 当前协议版本
export const protocol = 3;

// 包类型
export let packets: { [key in PacketType]: number } = {
  open: 0,
  close: 1,
  ping: 2,
  pong: 3,
  message: 4,
  upgrade: 5,
  noop: 6,
  error: 7,
};

const packetslist = keys(packets) as PacketType[];

// 错误包
const err: TransportPacket = {
  type: "error",
  data: "parser error",
};
// 空缓冲区
const EMPTY_BUFFER = new ArrayBuffer(0);

/**
 * @description: 数据包编码
 * @author: Quarter
 * @param {TransportPacket} packet 数据包
 * @param {boolean} supportsBinary 是否支持二进制
 * @param {boolean} utf8encode 是否 utf8 编码
 * @param {function} callback 回调函数
 * @return
 */
export const encodePacket = (packet: TransportPacket, ...args: any[]): void => {
  let supportsBinary = false;
  let utf8encode = false;
  let callback!: (str: string | ArrayBuffer) => void;
  if (args.length >= 3) {
    supportsBinary = args[0];
    utf8encode = args[1];
    callback = args[2];
  } else if (args.length >= 2) {
    supportsBinary = args[0];
    callback = args[1];
  } else if (args.length >= 1) {
    callback = args[0];
  }

  if ("function" !== typeof callback) {
    throw new Error("callback is not a function");
  }

  if (packet.data instanceof ArrayBuffer) {
    return encodeBuffer(packet, supportsBinary, callback);
  }

  // Sending data as a utf-8 string
  let encoded = packets[packet.type].toString();

  // data fragment is optional
  if (undefined !== packet.data) {
    encoded += utf8encode ? utf8.encode(String(packet.data), { strict: false }) : String(packet.data);
  }

  return callback("" + encoded);
};

/**
 * @description: 编码缓冲区数据
 * @author: Quarter
 * @param {TransportPacket} packet 数据包
 * @param {boolean} supportsBinary 是否支持二进制
 * @param {function} callback 回调函数
 * @return
 */
const encodeBuffer = (packet: TransportPacket, supportsBinary: boolean, callback: (str: string | ArrayBuffer) => void): void => {
  if (!supportsBinary) {
    return encodeBase64Packet(packet, callback);
  }
  const data = packet.data as ArrayBuffer;
  const typeBuffer = new ArrayBuffer(1);
  const typeView = new Uint8Array(typeBuffer);
  typeView[0] = packets[packet.type];
  return callback(concatenate(typeBuffer, data));
};

/**
 * @description: 编码 Base64 数据包
 * @author: Quarter
 * @param {TransportPacket} packet 数据包
 * @param {function} callback 回调函数
 * @return
 */
export const encodeBase64Packet = (packet: TransportPacket, callback: (str: string | ArrayBuffer) => void): void => {
  let message = "b" + packets[packet.type];
  if (packet.data instanceof ArrayBuffer) {
    message += btoa(String.fromCharCode(...new Uint16Array(packet.data)));
  }
  return callback(message);
};

/**
 * @description: 数据包解码
 * @author: Quarter
 * @param {string|ArrayBuffer} data 数据
 * @param {boolean} utf8decode 是否使用 utf8
 * @return {TransportPacket}
 */
export const decodePacket = (data: string | ArrayBuffer, utf8decode: boolean = false): TransportPacket => {
  if (typeof data === "string") { // String data
    const tempType = data.charAt(0);
    const typeNumber = Number(tempType);
    if (tempType === "b") {
      return decodeBase64Packet(data.substring(1));
    }
    if (utf8decode) {
      const result = tryDecode(data);
      if (result === false) {
        return err;
      } else {
        data = result as string;
      }
    }
    if (undefined === packetslist[typeNumber]) {
      return err;
    }
    if (data.length > 1) {
      return { type: packetslist[typeNumber], data: data.substring(1) };
    } else {
      return { type: packetslist[typeNumber], data: "" };
    }
  } else if (data instanceof ArrayBuffer) { // Binary data
    // wrap ArrayBuffer data into an Uint8Array
    const intArray = new Uint8Array(data);
    return { type: packetslist[intArray[0]], data: intArray.buffer.slice(1) };
  } else {
    return err;
  }
};

/**
 * @description: 尝试解码
 * @author: Quarter
 * @param {string} data
 * @return {string|false}
 */
function tryDecode(data: string): string | false {
  try {
    data = utf8.decode(data, { strict: false });
  } catch (e) {
    return false;
  }
  return data;
}

/**
 * @description: 解码 base64 数据包
 * @author: Quarter
 * @param {string} msg 消息数据
 * @return {TransportPacket}
 */
export const decodeBase64Packet = (msg: string): TransportPacket => {
  const type = packetslist[Number(msg.charAt(0))];
  const data: ArrayBuffer = stringToArrayBuffer(atob(msg.substring(1)));
  return { type, data };
};

/**
 * @description: 编码多条数据
 * @author: Quarter
 * @param {TransportPacket[]} transportPackets 数据包
 * @param {array} args 后续参数列表
 * @return
 */
export const encodePayload = (transportPackets: TransportPacket[], ...args: any[]): void => {
  let supportsBinary = false;
  let callback!: (str: string | ArrayBuffer) => void;
  if (args.length >= 2) {
    supportsBinary = args[0];
    callback = args[1];
  } else if (args.length >= 1) {
    callback = args[0];
  }

  if ("function" !== typeof callback) {
    throw new Error("callback is not a function");
  }

  if (supportsBinary && hasBinary(transportPackets)) {
    return encodePayloadAsBinary(transportPackets, callback);
  }

  if (!transportPackets.length) {
    return callback("0:");
  }

  const encodeOne = (packet: TransportPacket, doneCallback: (err: string | null, msg: string) => void) => {
    encodePacket(packet, supportsBinary, false, (message: string) => {
      doneCallback(null, setLengthHeader(message));
    });
  };

  map(transportPackets, encodeOne, (_: string, results: string[]) => {
    return callback(results.join(""));
  });
};

/**
 * @description: 设置长度头
 * @author: Quarter
 * @param {string} message 消息
 * @return {string}
 */
const setLengthHeader = (message: string): string => {
  return message.length + ":" + message;
};

/**
 * @description: 异步迭代数组
 * @author: Quarter
 * @param {any[]} ary 数组
 * @param {function} each 迭代器
 * @param {function} done 回调
 * @return
 */
const map = (
  ary: any[],
  each: (item: any, resolve: (error: string | null, msg: string | ArrayBuffer) => void) => void,
  done: AfterCallback
): void => {
  const result = new Array(ary.length);
  const next = after(ary.length, done);

  for (let i = 0; i < ary.length; i++) {
    each(ary[i], (error: string | null, msg: string | ArrayBuffer) => {
      result[i] = msg;
      next(error, result);
    });
  }
};

/**
 * @description: 解码数据
 * @author: Quarter
 * @param {string|ArrayBuffer} data 数据
 * @param {function} callback 回调函数
 * @return {void|false}
 */
export const decodePayload = (data: string | ArrayBuffer, callback: (packet: TransportPacket, index: number, total: number) => void | false): void | false => {
  if (data instanceof ArrayBuffer) {
    return decodePayloadAsBinary(data, callback);
  }

  if ("function" !== typeof callback) {
    throw new Error("callback is not a function");
  }

  if (data === "") {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

  let length = 0;
  let msg: string = "";

  for (let i = 0, l = data.length; i < l; i++) {
    const chr = data.charAt(i);

    if (chr !== ":") {
      const num = Number(chr);
      if (num.toString() !== chr) {
        return callback(err, 0, 1);
      }
      length += num;
      continue;
    }

    if (length === 0) {
      // parser error - ignoring payload
      return callback(err, 0, 1);
    }

    msg = data.substring(i + 1, length);

    if (length !== msg.length) {
      // parser error - ignoring payload
      return callback(err, 0, 1);
    }

    if (msg.length) {
      const packet = decodePacket(msg, false);

      if (err.type === packet.type && err.data === packet.data) {
        // parser error in individual packet - ignoring payload
        return callback(err, 0, 1);
      }

      const more = callback(packet, i + length, l);
      if (false === more) return;
    }

    // advance cursor
    i += length;
    length = 0;
  }

  if (length !== 0) {
    return callback(err, 0, 1);
  }
};

/**
 * @description: 缓冲区转字符串
 * @author: Quarter
 * @param {ArrayBuffer} buffer 缓冲区
 * @return {string}
 */
const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const bufView = new Uint8Array(buffer);
  let str = "";
  for (let i = 0, l = bufView.length; i < l; i++) {
    str += String.fromCharCode(bufView[i]);
  }
  return str;
};

/**
 * @description: 字符串转缓冲区
 * @author: Quarter
 * @param {string} str 字符串转缓冲区
 * @return {ArrayBuffer}
 */
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const buf = new ArrayBuffer(str.length * 2); // 每个字符占用2个字节
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

/**
 * @description: 将负载编码成二进制
 * @author: Quarter
 * @param {TransportPacket} packetList 数据包列表
 * @param {function} callback 回调函数
 * @return
 */
const encodePayloadAsBinary = (packetList: TransportPacket[], callback: (buffer: ArrayBuffer) => void): void => {
  if (!packetList.length) {
    return callback(EMPTY_BUFFER);
  }

  map(packetList, encodeOneBinaryPacket, (_: string, results: ArrayBuffer[]): void => {
    return callback(concatenate(...results));
  });
};

/**
 * @description: 编码一个二进制数据包
 * @author: Quarter
 * @param {TransportPacket} p 数据包
 * @param {function} doneCallback 完成回调
 * @return
 */
const encodeOneBinaryPacket = (p: TransportPacket, doneCallback: (err: string | null, buffer: ArrayBuffer) => void): void => {

  const onBinaryPacketEncode = (packet: string | ArrayBuffer): void => {
    let sizeBuffer: ArrayBuffer;

    if (typeof packet === "string") {
      const encodingLength = "" + packet.length;
      sizeBuffer = new ArrayBuffer((encodingLength.length + 1) * 2);
      const bufferView = new Uint8Array(sizeBuffer);
      bufferView[0] = 0; // is a string (not true binary = 0)
      for (let i = 0; i < encodingLength.length; i++) {
        bufferView[i + 1] = parseInt(encodingLength[i], 10);
      }
      bufferView[bufferView.length - 1] = 255;
      return doneCallback(null, concatenate(sizeBuffer, stringToArrayBuffer(packet)));
    } else {
      const encodingLength = "" + packet.byteLength;
      sizeBuffer = new ArrayBuffer(encodingLength.length + 2);
      const view = new Uint8Array(sizeBuffer);
      view[0] = 1; // is binary (true binary = 1)
      for (let i = 0; i < encodingLength.length; i++) {
        view[i + 1] = parseInt(encodingLength[i], 10);
      }
      view[view.length - 1] = 255;

      doneCallback(null, concatenate(sizeBuffer, packet));
    }
  };

  encodePacket(p, true, true, onBinaryPacketEncode);
};

/**
 * @description: 将负载解码成二进制数据
 * @author: Quarter
 * @param {ArrayBuffer} data 缓冲数据
 * @param {function} callback 回调函数
 * @return
 */
const decodePayloadAsBinary = (data: ArrayBuffer, callback: (packet: TransportPacket, index: number, total: number) => void): void => {
  let bufferTail = new Uint8Array(data);
  const buffers: (string | ArrayBuffer)[] = [];
  let i;

  while (bufferTail.length > 0) {
    let strLen = "";
    const isString = bufferTail[0] === 0;
    for (i = 1; ; i++) {
      if (bufferTail[i] === 255) break;
      // 310 = char length of Number.MAX_VALUE
      if (strLen.length > 310) {
        return callback(err, 0, 1);
      }
      strLen += "" + bufferTail[i];
    }
    bufferTail = bufferTail.slice(strLen.length + 1);

    const msgLength = parseInt(strLen, 10);

    let msg: string | ArrayBuffer = bufferTail.slice(1, msgLength + 1).buffer;
    if (isString) msg = arrayBufferToString(msg);
    buffers.push(msg);
    bufferTail = bufferTail.slice(msgLength + 1);
  }

  const total = buffers.length;
  for (i = 0; i < total; i++) {
    const buffer = buffers[i];
    callback(decodePacket(buffer, true), i, total);
  }
};

/**
 * @description: 合并 ArrayBuffer
 * @author: Quarter
 * @param {ArrayBuffer[]} arrays 数组
 * @return {ArrayBuffer}
 */
const concatenate = (...arrays: ArrayBuffer[]): ArrayBuffer => {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.byteLength;
  }
  const result = new ArrayBuffer(totalLength);
  const view = new Uint8Array(result);
  let offset = 0;
  for (const arr of arrays) {
    const temp = new Uint8Array(arr);
    view.set(temp, offset);
    offset += temp.length;
  }
  return result;
};