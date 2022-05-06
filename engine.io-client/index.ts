/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:24:14
 * @LastEditTime: 2022-05-05 13:34:20
 * @LastEditors: Quarter
 * @Description: 入口文件
 * @FilePath: /socket.io-client/engine.io-client/index.ts
 */

import Socket from "./socket";
import * as parser from "engine.io-parser";

export default Socket;
export {
  parser,
};

export * from "./socket";