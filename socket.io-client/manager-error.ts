/*
 * @Author: Quarter
 * @Date: 2022-05-04 14:39:26
 * @LastEditTime: 2022-05-04 14:40:34
 * @LastEditors: Quarter
 * @Description: 管理器错误
 * @FilePath: /socket.io-client/socket.io-client/manager-error.ts
 */

export default class ManagerError extends Error {
  constructor(msg?: string, data?: any) {
    super(msg);

    if (data) {
      this.data = data;
    }
  }

  data: any = null;
}