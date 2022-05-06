/*
 * @Author: Quarter
 * @Date: 2022-04-27 08:53:19
 * @LastEditTime: 2022-05-04 14:18:43
 * @LastEditors: Quarter
 * @Description: 指数退避算法
 * @FilePath: /socket.io-client/utils/backoff.ts
 */

// 配置项
export interface BackoffOptions {
  min?: number; // 最小时常，默认为 100
  max?: number; // 最大时常，默认为 10000
  factor?: number; // 因子，默认为 2
  jitter?: number; // 抖动，默认为 0
}


class Backoff {
  constructor(opts: BackoffOptions = {}) {
    opts = opts || {};
    this._ms = opts.min || 100;
    this._max = opts.max || 10000;
    this._factor = opts.factor || 2;
    this._jitter = "number" === typeof opts.jitter && opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
  }

  _ms = 100; // 毫秒数
  _max = 10000; // 上限
  _factor = 2; // 因子
  _jitter = 0; // 抖动
  attempts = 0; // 尝试次数

  /**
   * @description: 获取延迟事件
   * @author: Quarter
   * @return {number}
   */
  duration(): number {
    let ms = this._ms * Math.pow(this._factor, this.attempts++);
    if (this._jitter) {
      const rand = Math.random();
      const deviation = Math.floor(rand * this._jitter * ms);
      // tslint:disable-next-line: no-bitwise
      ms = (Math.floor(rand * 10) & 1) === 0 ? ms - deviation : ms + deviation;
    }
    // tslint:disable-next-line: no-bitwise
    return Math.min(ms, this._max) | 0;
  }

  /**
   * @description: 重置
   * @author: Quarter
   * @return
   */
  reset(): void {
    this.attempts = 0;
  }

  /**
   * @description: 设置最小值
   * @author: Quarter
   * @param {number} min 最小时常
   * @return
   */
  setMin(min: number): void {
    this._ms = min;
  }

  /**
   * @description: 设置最大值
   * @author: Quarter
   * @param {number} max 最大时常
   * @return
   */
  setMax(max: number): void {
    this._max = max;
  }

  /**
   * @description: 设置抖动
   * @author: Quarter
   * @param {number} jitter 抖动值
   * @return
   */
  setJitter(jitter: number): void {
    this._jitter = jitter;
  }
}


export default Backoff;