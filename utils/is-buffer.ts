/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:20:37
 * @LastEditTime: 2022-05-04 15:24:46
 * @LastEditors: Quarter
 * @Description: 判断是否是缓冲数据
 * @FilePath: /socket.io-client/utils/is-buffer.ts
 */

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
 * @description: 是否是缓冲数据
 * @author: Quarter
 * @param {any} obj 对象
 * @return {boolean}
 */
const isBuffer = (obj: any): boolean => {
  return (withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)));
};

export default isBuffer;