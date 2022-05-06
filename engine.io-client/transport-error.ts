/*
 * @Author: Quarter
 * @Date: 2022-04-28 08:00:44
 * @LastEditTime: 2022-04-28 08:01:50
 * @LastEditors: Quarter
 * @Description: 传输错误类
 * @FilePath: /socket.io-client/engine.io-client/transport-error.ts
 */

interface TransportErrorOption {
  description?: string;
}

class TransportError extends Error {
  constructor(msg: string, opts: TransportErrorOption = {}) {
    super(msg);
    if ("string" === typeof opts.description) this.description = opts.description;
  }

  type = "TransportError";
  description: string | null = null;
}

export default TransportError;