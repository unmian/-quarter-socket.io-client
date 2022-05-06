/*
 * @Author: Quarter
 * @Date: 2022-04-28 11:47:16
 * @LastEditTime: 2022-04-28 12:01:04
 * @LastEditors: Quarter
 * @Description: id 生成工具
 * @FilePath: /socket.io-client/utils/yeast.ts
 */
"use strict";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
const length = 64;
const map: { [key: string]: number; } = {};
let seed = 0;
let prev: string = "";

for (let i = 0; i < length; i++) map[alphabet[i]] = i;

/**
 * @description: 返回指定数字的字符串
 * @author: Quarter
 * @param {number} num 数字
 * @return {string}
 */
const encode = (num: number): string => {
  let encoded = "";

  do {
    encoded = alphabet[num % length] + encoded;
    num = Math.floor(num / length);
  } while (num > 0);

  return encoded;
};

/**
 * @description: 解码字符串
 * @author: Quarter
 * @param {string} str 字符串
 * @return {number}
 */
const decode = (str: string): number => {
  let decoded = 0;

  for (let i = 0; i < str.length; i++) {
    decoded = decoded * length + map[str.charAt(i)];
  }

  return decoded;
};

/**
 * @description: 生成唯一 id
 * @author: Quarter
 * @return {string}
 */
const yeast = (): string | undefined => {
  const now = encode(+new Date());

  if (now !== prev) return seed = 0, prev = now;

  return now + "." + encode(seed++);
};

export default yeast;