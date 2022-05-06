/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:13
 * @LastEditTime: 2022-04-28 03:17:16
 * @LastEditors: Quarter
 * @Description: 全局变量
 * @FilePath: /socket.io-client/engine.io-client/globalThis.ts
 */

export default (() => {
  if (typeof window !== "undefined") {
    return window;
  } else {
    return Function("return this")();
  }
})();
