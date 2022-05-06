/*
 * @Author: Quarter
 * @Date: 2022-04-27 03:43:09
 * @LastEditTime: 2022-05-05 10:16:00
 * @LastEditors: Quarter
 * @Description: 事件监听
 * @FilePath: /socket.io-client/socket.io-client/on.ts
 */

import { Emitter, EmitterFunc } from "utils";

/**
 * @description: 事件
 * @author: Quarter
 * @param {Emitter} obj 事件中心
 * @param {string} ev 事件名称
 * @param {EmitterFunc} fn 事件回调方法
 * @param {Object} caller 调用者
 * @return
 */
const on = (obj: Emitter, ev: string, fn: EmitterFunc, caller?: any) => {
  obj.on(ev, fn, caller);
  return {
    destroy: () => {
      obj.removeEventListener(ev, fn);
    },
  };
};

export default on;
