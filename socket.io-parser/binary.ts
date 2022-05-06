/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:20:37
 * @LastEditTime: 2022-05-04 15:21:16
 * @LastEditors: Quarter
 * @Description: 二进制数据处理
 * @FilePath: /socket.io-client/socket.io-parser/binary.ts
 */

import { isArray } from "utils";
import { type SocketIOPacket } from ".";

const withNativeBlob = typeof Blob === "function" || (typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]");
const withNativeFile = typeof File === "function" || (typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]");

/**
 * @description: 结构包数据
 * @author: Quarter
 * @param {SocketIOPacket} packet
 * @return {object}
 */
export const deconstructPacket = (packet: SocketIOPacket): { packet: SocketIOPacket, buffers: (string | ArrayBuffer)[] } => {
  const buffers: (string | ArrayBuffer)[] = [];
  const packetData = packet.data;
  const pack = packet;
  pack.data = _deconstructPacket(packetData, buffers);
  pack.attachments = buffers.length; // number of binary "attachments"
  return { packet: pack, buffers, };
};

/**
 * @description: 结构化数据包
 * @author: Quarter
 * @param {any} data 数据
 * @param {Array<string|ArrayBuffer>} buffers 缓冲区
 * @return {any}
 */
const _deconstructPacket = (data: any, buffers: (string | ArrayBuffer)[]): any => {
  if (!data) return data;

  if (data instanceof ArrayBuffer) {
    const placeholder = { _placeholder: true, num: buffers.length };
    buffers.push(data);
    return placeholder;
  } else if (isArray(data)) {
    const newData = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
      newData[i] = _deconstructPacket(data[i], buffers);
    }
    return newData;
  } else if (typeof data === "object" && !(data instanceof Date)) {
    const newData: { [key: string | number]: any; } = {};
    for (const key in data) {
      if (key) {
        newData[key] = _deconstructPacket(data[key], buffers);
      }
    }
    return newData;
  }
  return data;
};

/**
 * @description: 重构传输包
 * @author: Quarter
 * @param {SocketIOPacket} packet 数据包
 * @param {Array<string|ArrayBuffer>} buffers 缓冲区
 * @return {SocketIOPacket}
 */
export const reconstructPacket = (packet: SocketIOPacket, buffers: (string | ArrayBuffer)[]): SocketIOPacket => {
  packet.data = _reconstructPacket(packet.data, buffers);
  packet.attachments = undefined; // no longer useful
  return packet;
};


/**
 * @description: 结构化包数据实现逻辑
 * @author: Quarter
 * @param {any} data 数据
 * @param {Array<string|ArrayBuffer>} buffers 缓冲区
 * @return {any} 数据
 */
const _reconstructPacket = (data: any, buffers: (string | ArrayBuffer)[]): any => {
  if (!data) return data;

  if (data && data._placeholder) {
    return buffers[data.num]; // appropriate buffer (should be natural order anyway)
  } else if (isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = _reconstructPacket(data[i], buffers);
    }
  } else if (typeof data === "object") {
    for (const key in data) {
      if (key) {
        data[key] = _reconstructPacket(data[key], buffers);
      }
    }
  }

  return data;
};

/**
 * @description: 将 Blob 转换为流数据
 * @author: Quarter
 * @param {any} data 任意数据
 * @param {function} callback 回调函数
 * @return
 */
export const removeBlobs = (data: any, callback: (data: any) => void): void => {
  let pendingBlobs = 0;
  let bloblessData = data;

  const _removeBlobs = (obj: any, curKey?: string | number, containingObject?: any) => {
    if (!obj) return obj;

    if ((withNativeBlob && obj instanceof Blob) ||
      (withNativeFile && obj instanceof File)) {
      // 转换 blob 和 file
      pendingBlobs++;

      // async filereader
      const fileReader = new FileReader();
      fileReader.addEventListener("load", (ev: ProgressEvent<FileReader>) => {
        if (containingObject && undefined !== curKey) {
          containingObject[curKey] = ev.target?.result;
        }
        else {
          bloblessData = ev.target?.result;
        }
        pendingBlobs--;
        if (pendingBlobs === 0) {
          callback(bloblessData);
        }
      });
      // 将 blob 转换为 arraybuffer
      fileReader.readAsArrayBuffer(obj);
    } else if (isArray(obj)) {
      // 处理数组逻辑
      for (let i = 0; i < obj.length; i++) {
        _removeBlobs(obj[i], i, obj);
      }
    } else if (typeof obj === "object" && !(obj instanceof ArrayBuffer)) {
      // 处理对象逻辑
      for (const key in obj) {
        if (key) {
          _removeBlobs(obj[key], key, obj);
        }
      }
    }
  };
  _removeBlobs(bloblessData);
  if (pendingBlobs === 0) {
    callback(bloblessData);
  }
};
