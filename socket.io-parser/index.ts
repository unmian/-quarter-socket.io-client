/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:20:36
 * @LastEditTime: 2022-05-05 08:52:01
 * @LastEditors: Quarter
 * @Description: 入口文件
 * @FilePath: /socket.io-client/socket.io-parser/index.ts
 */
export type PacketType = "CONNECT" | "DISCONNECT" | "EVENT" | "ACK" | "ERROR" | "BINARY_EVENT" | "BINARY_ACK";

export interface SocketIOPacket {
  attachments?: number | undefined; // 附件
  data: any; // 数据内容
  id: number; // 编号
  nsp?: string; // 命名空间
  options?: {
    compress?: boolean; // 是否压缩
  };
  query?: { [key: string | number]: string | number | boolean };
  type: number; // 类型
}

// 协议版本
export const protocol = 4;
// 包类型
export const types: PacketType[] = [
  "CONNECT",
  "DISCONNECT",
  "EVENT",
  "ACK",
  "ERROR",
  "BINARY_EVENT",
  "BINARY_ACK",
];
// 包类型索引
export const CONNECT = 0;
export const DISCONNECT = 1;
export const EVENT = 2;
export const ACK = 3;
export const ERROR = 4;
export const BINARY_EVENT = 5;
export const BINARY_ACK = 6;

export const ERROR_PACKET = ERROR + "'encode error'";

export * from "./decoder";
export * from "./encoder";