/*
 * @Author: Quarter
 * @Date: 2022-05-04 15:05:31
 * @LastEditTime: 2022-05-06 03:24:35
 * @LastEditors: Quarter
 * @Description: 入口文件
 * @FilePath: /socket.io-client/test/main.ts
 */

localStorage.debug = "*";
// import Socket from "socket.io-client";
// @ts-ignore
import Socket from "lib/index.es.js";

const socket = Socket({
  path: "/socket.io",
});

socket.on("connect", () => {
  console.log("yes", "connect");
});

socket.on("parkingSummaryInformation", (data: any) => {
  console.log("yes", data);
  socket.send("test", { name: 1 });
});

console.log(socket);