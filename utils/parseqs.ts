/*
 * @Author: Quarter
 * @Date: 2022-04-28 00:56:42
 * @LastEditTime: 2022-04-28 11:45:11
 * @LastEditors: Quarter
 * @Description: 对象字符串转换工具
 * @FilePath: /socket.io-client/utils/parseqs.ts
 */

/**
 * @description: 将对象转换成字符串
 * @author: Quarter
 * @param {Object} obj 对象
 * @return {string}
 */
export const encode = (obj: { [key: string]: string | number; }): string => {
  let str = "";

  for (const i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (str.length) str += "&";
      str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
    }
  }

  return str;
};

/**
 * @description: 将字符串转换成对象
 * @author: Quarter
 * @param {string} qs
 * @return {Object}
 */
export const decode = (qs: string): { [key: string]: string } => {
  const qry: any = {};
  const pairs = qs.split("&");
  for (let i = 0, l = pairs.length; i < l; i++) {
    const pair = pairs[i].split("=");
    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return qry;
};