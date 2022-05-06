/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:28:42
 * @LastEditTime: 2022-04-28 02:10:21
 * @LastEditors: Quarter
 * @Description: 获取对象的键名列表
 * @FilePath: /socket.io-client/utils/keys.ts
 */

/**
 * @description: 获取对象键名列表
 * @author: Quarter
 * @param {Object} obj 对象
 * @return {(string|number)[]}
 */
const keys = Object.keys || ((obj): (string | number)[] => {
  const arr: (string | number)[] = [];
  const has = Object.prototype.hasOwnProperty;

  for (const i in obj) {
    if (has.call(obj, i)) {
      arr.push(i);
    }
  }
  return arr;
});

export default keys;
