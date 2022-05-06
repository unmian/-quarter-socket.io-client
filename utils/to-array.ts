/*
 * @Author: Quarter
 * @Date: 2022-04-28 00:52:14
 * @LastEditTime: 2022-04-28 00:54:42
 * @LastEditors: Quarter
 * @Description: 数组转换
 * @FilePath: /socket.io-client/utils/to-array.ts
 */

/**
 * @description: 将类似数组的元素转换为数组
 * @author: Quarter
 * @param {any} list 类似数组的元素
 * @param {number} index 索引
 * @return {any[]}
 */
const toArray = (list: any, index: number = 0): any[] => {
  const array = [];

  for (let i = index || 0; i < list.length; i++) {
    array[i - index] = list[i];
  }

  return array;
};

export default toArray;