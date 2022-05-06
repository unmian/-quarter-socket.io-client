/*
 * @Author: Quarter
 * @Date: 2022-04-27 07:21:22
 * @LastEditTime: 2022-04-27 08:50:02
 * @LastEditors: Quarter
 * @Description: 函数数据绑定
 * @FilePath: /socket.io-client/utils/bind.ts
 */

const slice = [].slice;

/**
 * @description: 为函数绑定数据
 * @author: Quarter
 * @param {Object} obj 对象
 * @param {string|Function} 方法
 * @return {Function}
 */
// tslint:disable-next-line: ban-types
function bind(obj: any, fn: string | Function): () => void {
  if ("string" === typeof fn && "function" === typeof obj[fn]) fn = obj[fn];
  if ("function" !== typeof fn) throw new Error("bind() requires a function");
  const args = slice.call(arguments, 2);
  // tslint:disable-next-line: only-arrow-functions
  return () => {
    // tslint:disable-next-line: ban-types
    return (fn as Function).apply(obj, args.concat(slice.call(arguments)));
  };
}

export default bind;