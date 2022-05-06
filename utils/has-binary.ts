/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:08:40
 * @LastEditTime: 2022-04-28 01:14:47
 * @LastEditors: Quarter
 * @Description: 判断对象是否包含二进制数据
 * @FilePath: /socket.io-client/utils/has-binary.ts
 */
/* global Blob File */
const withNativeBlob = typeof Blob === "function" ||
  typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
const withNativeFile = typeof File === "function" ||
  typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
const withNativeArrayBuffer = typeof ArrayBuffer === "function";

/**
 * @description: ArrayBuffer.isView 兼容
 * @author: Quarter
 * @param {any} obj 对象
 * @return {boolean}
 */
const isView = (obj: any): boolean => {
  return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : (obj.buffer instanceof ArrayBuffer);
};


/**
 * @description: 判断是否是二进制文件
 * @author: Quarter
 * @param {any} obj 对象
 * @return {boolean}
 */
const hasBinary = (obj: any, ...args: any[]): boolean => {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  if (Array.isArray(obj)) {
    for (let i = 0, l = obj.length; i < l; i++) {
      if (hasBinary(obj[i])) {
        return true;
      }
    }
    return false;
  }

  if (withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)) ||
    (withNativeBlob && obj instanceof Blob) ||
    (withNativeFile && obj instanceof File)
  ) {
    return true;
  }

  // see: https://github.com/Automattic/has-binary/pull/4
  if (obj.toJSON && typeof obj.toJSON === "function" && args.length === 0) {
    return hasBinary(obj.toJSON(), true);
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
      return true;
    }
  }

  return false;
};

export default hasBinary;