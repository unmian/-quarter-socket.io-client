/*
 * @Author: Quarter
 * @Date: 2022-05-04 01:23:21
 * @LastEditTime: 2022-05-05 08:51:54
 * @LastEditors: Quarter
 * @Description: 编码器
 * @FilePath: /socket.io-client/socket.io-parser/encoder.ts
 */

import Debug from "debug";
import { BINARY_ACK, BINARY_EVENT, ERROR_PACKET, SocketIOPacket } from ".";
import { deconstructPacket, removeBlobs } from "./binary";

const debug = Debug("socket.io-parser");

/**
 * @description: 尝试将对象转换为 JSON 字符串
 * @author: Quarter
 * @param {any} value 对象
 * @return {string|boolean}
 */
const tryStringify = (value: any): string | boolean => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return false;
  }
};

/**
 * @description: 将包转换为字符串
 * @author: Quarter
 * @param {SocketIOPacket} obj 包数据
 * @return {string}
 */
const encodeAsString = (obj: SocketIOPacket): string => {

  // first is type
  let str = "" + obj.type;

  // attachments if we have them
  if (BINARY_EVENT === obj.type || BINARY_ACK === obj.type) {
    str += obj.attachments + "-";
  }

  // if we have a namespace other than `/`
  // we append it followed by a comma `,`
  if (obj.nsp && "/" !== obj.nsp) {
    str += obj.nsp + ",";
  }

  // immediately followed by the id
  if (null !== obj.id) {
    str += obj.id;
  }

  // json data
  if (null != obj.data) {
    const payload = tryStringify(obj.data);
    if (payload !== false) {
      str += payload;
    } else {
      return ERROR_PACKET;
    }
  }

  debug("encoded %j as %s", obj, str);
  return str;
};

/**
 * @description: 编码成二进制数据
 * @author: Quarter
 * @param {SocketIOPacket} obj 包数据
 * @param {function} callback 回调函数
 * @return
 */
const encodeAsBinary = (obj: SocketIOPacket, callback: (buffers: (string | ArrayBuffer)[]) => void): void => {

  const writeEncoding = (bloblessData: any): void => {
    const deconstruction = deconstructPacket(bloblessData);
    const pack = encodeAsString(deconstruction.packet);
    const buffers = deconstruction.buffers;

    buffers.unshift(pack); // add packet info to beginning of data list
    callback(buffers); // write all the buffers
  };

  removeBlobs(obj, writeEncoding);
};

export class Encoder {
  /**
   * @description: 编码
   * @author: Quarter
   * @param {SocketIOPacket} obj
   * @param {function} callback 回调函数
   * @return
   */
  encode(obj: SocketIOPacket, callback: (buffers: (string | ArrayBuffer)[]) => void): void {
    debug("encoding packet %j", obj);

    if (BINARY_EVENT === obj.type || BINARY_ACK === obj.type) {
      encodeAsBinary(obj, callback);
    } else {
      const encoding = encodeAsString(obj);
      callback([encoding]);
    }
  }
}