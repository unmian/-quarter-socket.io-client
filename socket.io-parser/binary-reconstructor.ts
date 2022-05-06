/*
 * @Author: Quarter
 * @Date: 2022-05-04 01:30:40
 * @LastEditTime: 2022-05-04 15:23:12
 * @LastEditors: Quarter
 * @Description: 二进制构造器
 * @FilePath: /socket.io-client/socket.io-parser/binary-reconstructor.ts
 */

import { SocketIOPacket } from ".";
import { reconstructPacket } from "./binary";

export default class BinaryReconstructor {
  constructor(packet: SocketIOPacket) {
    this.reconPack = packet;
    this.buffers = [];
  }

  reconPack: SocketIOPacket | null = null;
  buffers: ArrayBuffer[] = [];

  /**
   * @description: 处理二进制数据
   * @author: Quarter
   * @param {ArrayBuffer} binData 二进制数据
   * @return {SocketIOPacket | null}
   */
  takeBinaryData(binData: ArrayBuffer): SocketIOPacket | null {
    this.buffers.push(binData);
    if (this.buffers.length === this.reconPack?.attachments) { // done with buffer list
      const packet = reconstructPacket(this.reconPack, this.buffers);
      this.finishedReconstruction();
      return packet;
    }
    return null;
  }

  /**
   * @description: 清理二进制包数据
   * @author: Quarter
   * @return
   */
  finishedReconstruction(): void {
    this.reconPack = null;
    this.buffers = [];
  }
}