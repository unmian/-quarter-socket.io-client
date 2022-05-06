/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:34:36
 * @LastEditTime: 2022-04-28 01:38:02
 * @LastEditors: Quarter
 * @Description: 是否是数组
 * @FilePath: /socket.io-client/utils/is-array.ts
 */
/**
 * @description: 是否是数组
 * @author: Quarter
 * @param {any} arg 对象
 * @return {boolean}
 */
const isArray = Array.isArray || ((arg: any): arg is any[] => {
  return toString.call(arg) === "[object Array]";
});

export default isArray;