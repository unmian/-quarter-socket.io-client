/*
 * @Author: Quarter
 * @Date: 2022-04-27 09:11:16
 * @LastEditTime: 2022-05-05 10:09:16
 * @LastEditors: Quarter
 * @Description: 事件管理器
 * @FilePath: /socket.io-client/utils/emitter.ts
 */

export type EmitterFunc = (...args: any[]) => void;
export type EmitterMixin = any & Emitter;

/**
 * @description: 混入事件管理器
 * @author: Quarter
 * @param {object} obj 混入对象
 * @return {EmitterMixin}
 */
export const mixin = <T>(obj: T): T & Emitter => {
  return Object.assign(obj, new Emitter());
};

class Emitter {
  // 回调仓库
  _callbacks: { [key: string]: EmitterFunc[] } = {};
  // 调用者仓库
  _callers: { [key: string]: any[] } = {};

  /**
   * @description: 添加事件监听
   * @author: Quarter
   * @param {string} event 事件名称
   * @param {EmitterFunc} fn 回调方法
   * @param {Object} caller 调用者
   * @return {Emitter}
   */
  on(event: string, fn: EmitterFunc, caller?: any): Emitter {
    return this._addEventListener(event, fn, caller);
  }

  /**
   * @description: 添加事件监听
   * @author: Quarter
   * @param {string} event 事件名称
   * @param {EmitterFunc} fn 回调方法
   * @param {Object} caller 调用者
   * @return {Emitter}
   */
  addEventListener(event: string, fn: EmitterFunc, caller?: any): Emitter {
    return this._addEventListener(event, fn, caller);
  }

  /**
   * @description: 添加事件监听逻辑
   * @author: Quarter
   * @param {string} event 事件名称
   * @param {EmitterFunc} fn 回调方法
   * @param {Object} caller 调用者
   * @return {Emitter}
   */
  _addEventListener(event: string, fn: EmitterFunc, caller?: any): Emitter {
    this._callbacks = this._callbacks || {};
    this._callers = this._callers || {};
    (this._callbacks["$" + event] = this._callbacks["$" + event] || [])
      .push(fn);
    (this._callers["$" + event] = this._callers["$" + event] || [])
      .push(caller);
    return this;
  }
  /**
   * @description: 添加事件监听
   * @author: Quarter
   * @param {string} event 事件名称
   * @param {EmitterFunc} fn 回调方法
   * @param {Object} caller 调用者
   * @return {Emitter}
   */
  once(event: string, fn: EmitterFunc, caller?: any): Emitter {
    const on = (...args: any[]): void => {
      this.off(event, on);
      fn(...args);
    };
    this.on(event, on, caller);
    return this;
  }

  /**
   * @description: 取消事件监听
   * @author: Quarter
   * @param {string} event 事件名称
   * @param {EmitterFunc} fn 回调方法
   * @return {Emitter}
   */
  off(event: string, fn: EmitterFunc): Emitter {
    return this._removeEventListener(event, fn);
  }

  /**
   * @description: 取消事件监听
   * @author: Quarter
   * @param {string} event 事件名称
   * @param {EmitterFunc} fn 回调方法
   * @return {Emitter}
   */
  removeEventListener(event: string, fn: EmitterFunc): Emitter {
    return this._removeEventListener(event, fn);
  }

  /**
   * @description: 取消事件监听
   * @author: Quarter
   * @param {string} event 事件名称
   * @return {Emitter}
   */
  removeListener(event: string): Emitter {
    delete this._callbacks["$" + event];
    delete this._callers["$" + event];
    return this;
  }

  /**
   * @description: 移除所有监听者
   * @author: Quarter
   * @return {Emitter}
   */
  removeAllListeners(): Emitter {
    this._callbacks = {};
    this._callers = {};
    return this;
  }

  /**
   * @description: 取消事件监听
   * @author: Quarter
   * @param {string} event 事件名称
   * @param {EmitterFunc} fn 回调方法
   * @return {Emitter}
   */
  _removeEventListener(event: string, fn: EmitterFunc): Emitter {
    this._callbacks = this._callbacks || {};
    this._callers = this._callers || {};

    // 获取监听者列表
    const callbacks = this._callbacks["$" + event];
    const _callers = this._callers["$" + event];
    if (!callbacks) return this;

    // 移除指定监听者
    for (let i = 0; i < callbacks.length; i++) {
      const cb = callbacks[i];
      if (cb === fn) {
        callbacks.splice(i, 1);
        _callers.splice(i, 1);
        break;
      }
    }

    // 清理空的监听者列表
    if (callbacks.length === 0) {
      delete this._callbacks["$" + event];
      delete this._callers["$" + event];
    }

    return this;
  }
  /**
   * @description: 触发事件
   * @author: Quarter
   * @param {string} event 事件名称
   * @return {Emitter}
   */
  emit(event: string, ...args: any[]): Emitter {
    this._callbacks = this._callbacks || {};
    this._callers = this._callers || {};
    // 迭代执行
    const callbacks = this._callbacks["$" + event];
    const callers = this._callers["$" + event];
    if (Array.isArray(callbacks)) {
      callbacks.forEach((callback: EmitterFunc, index: number) => {
        if (undefined !== callers[index]) {
          callback.apply(callers[index], args);
        } else {
          callback(...args);
        }
      });
    }

    return this;
  }

  /**
   * @description: 获取事件的监听者
   * @author: Quarter
   * @param {string} event 事件名称
   * @return {Function[]}
   */
  listeners(event: string): EmitterFunc[] {
    this._callbacks = this._callbacks || {};
    return this._callbacks["$" + event] || [];
  }

  /**
   * @description: 判断事件是否有监听者
   * @author: Quarter
   * @param {string} event 事件名称
   * @return {boolean}
   */
  hasListeners(event: string): boolean {
    return !!this.listeners(event).length;
  }
}

export default Emitter;