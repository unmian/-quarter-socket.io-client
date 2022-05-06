/*
 * @Author: Quarter
 * @Date: 2022-04-28 02:50:44
 * @LastEditTime: 2022-04-28 10:46:44
 * @LastEditors: Quarter
 * @Description: 小型流量控制系统
 * @FilePath: /socket.io-client/utils/after.ts
 */

export type AfterCallback = (err?: any, result?: any) => void;
interface AfterProxy {
  (err: any, result: any): void;
  count: number;
}

// tslint:disable-next-line: no-empty
const after = (count: number, callback: AfterCallback, errorCallback: AfterCallback = () => { }): AfterCallback | AfterProxy => {
  let bail = false;

  const proxy: AfterProxy = (err, result) => {
    if (proxy.count <= 0) {
      throw new Error("after called too many times");
    }
    --proxy.count;

    // after first error, rest are passed to err_cb
    if (err) {
      bail = true;
      callback(err);
      // future error callbacks will go to error handler
      callback = errorCallback;
    } else if (proxy.count === 0 && !bail) {
      callback(null, result);
    }
  };
  proxy.count = count;

  return (count === 0) ? callback : proxy;
};

export default after;