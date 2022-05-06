/*
 * @Author: Quarter
 * @Date: 2022-04-28 01:28:43
 * @LastEditTime: 2022-05-05 13:10:24
 * @LastEditors: Quarter
 * @Description: utf8 工具
 * @FilePath: /socket.io-client/utils/utf8.ts
 */

interface UTF8Options {
  strict?: boolean;
}

const stringFromCharCode = String.fromCharCode;

let byteArray: number[];
let byteCount: number;
let byteIndex: number;

/**
 * @description: ucs2 解码
 * @author: Quarter
 * @param {string} str 字符串
 * @return {number[]}
 */
const ucs2decode = (str: string): number[] => {
  const output: number[] = [];
  let counter = 0;
  const length = str.length;
  let value: number;
  let extra: number;
  while (counter < length) {
    value = str.charCodeAt(counter++);
    if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
      // high surrogate, and there is a next character
      extra = str.charCodeAt(counter++);
      // tslint:disable-next-line: no-bitwise
      if ((extra & 0xFC00) === 0xDC00) { // low surrogate
        // tslint:disable-next-line: no-bitwise
        output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
      } else {
        // unmatched surrogate; only append this code unit, in case the next
        // code unit is the high surrogate of a surrogate pair
        output.push(value);
        counter--;
      }
    } else {
      output.push(value);
    }
  }
  return output;
};

/**
 * @description: ucs2 编码
 * @author: Quarter
 * @param {number[]} array 字节码数组
 * @return {string}
 */
const ucs2encode = (array: number[]): string => {
  const length = array.length;
  let index = -1;
  let value: number;
  let output: string = "";
  while (++index < length) {
    value = array[index];
    if (value > 0xFFFF) {
      value -= 0x10000;
      // tslint:disable-next-line: no-bitwise
      output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
      // tslint:disable-next-line: no-bitwise
      value = 0xDC00 | value & 0x3FF;
    }
    output += stringFromCharCode(value);
  }
  return output;
};

/**
 * @description: 检查标量值
 * @author: Quarter
 * @param {number} codePoint 码点
 * @param {boolean} strict 是否严格模式
 * @return {boolean}
 */
const checkScalarValue = (codePoint: number, strict: boolean = false): boolean => {
  if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
    if (strict) {
      throw Error(
        "Lone surrogate U+" + codePoint.toString(16).toUpperCase() +
        " is not a scalar value"
      );
    }
    return false;
  }
  return true;
};


/**
 * @description: 创建字节
 * @author: Quarter
 * @param {number} codePoint 码点
 * @param {number} shift 移码
 * @return {string}
 */
const createByte = (codePoint: number, shift: number): string => {
  // tslint:disable-next-line: no-bitwise
  return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
};

/**
 * @description: 码点编码
 * @author: Quarter
 * @param {number} codePoint 码点
 * @param {boolean} strict 是否严格模式
 * @return {string}
 */
const encodeCodePoint = (codePoint: number, strict: boolean = false): string => {
  // tslint:disable-next-line: no-bitwise
  if ((codePoint & 0xFFFFFF80) === 0) { // 1-byte sequence
    return stringFromCharCode(codePoint);
  }
  let symbol: string = "";
  // tslint:disable-next-line: no-bitwise
  if ((codePoint & 0xFFFFF800) === 0) { // 2-byte sequence
    // tslint:disable-next-line: no-bitwise
    symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
    // tslint:disable-next-line: no-bitwise
  } else if ((codePoint & 0xFFFF0000) === 0) { // 3-byte sequence
    if (!checkScalarValue(codePoint, strict)) {
      codePoint = 0xFFFD;
    }
    // tslint:disable-next-line: no-bitwise
    symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
    symbol += createByte(codePoint, 6);
    // tslint:disable-next-line: no-bitwise
  } else if ((codePoint & 0xFFE00000) === 0) { // 4-byte sequence
    // tslint:disable-next-line: no-bitwise
    symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
    symbol += createByte(codePoint, 12);
    symbol += createByte(codePoint, 6);
  }
  // tslint:disable-next-line: no-bitwise
  symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
  return symbol;
};

/**
 * @description: utf8 编码
 * @author: Quarter
 * @param {string} str 字符串
 * @param {UTF8Options} opts 配置项
 * @return {string}
 */
const utf8encode = (str: string, opts: UTF8Options = {}): string => {
  const strict = false !== opts.strict;

  const codePoints = ucs2decode(str);
  const length = codePoints.length;
  let index = -1;
  let codePoint: number;
  let byteString: string = "";
  while (++index < length) {
    codePoint = codePoints[index];
    byteString += encodeCodePoint(codePoint, strict);
  }
  return byteString;
};

/**
 * @description: 读取连续字节
 * @author: Quarter
 * @return {number}
 */
const readContinuationByte = (): number => {
  if (byteIndex >= byteCount) {
    throw Error("Invalid byte index");
  }

  // tslint:disable-next-line: no-bitwise
  const continuationByte: number = byteArray[byteIndex] & 0xFF;
  byteIndex++;

  // tslint:disable-next-line: no-bitwise
  if ((continuationByte & 0xC0) === 0x80) {
    // tslint:disable-next-line: no-bitwise
    return continuationByte & 0x3F;
  }

  // If we end up here, it’s not a continuation byte
  throw Error("Invalid continuation byte");
};

/**
 * @description: 解码标记位
 * @author: Quarter
 * @param {boolean} strict 是否严格模式
 * @return {number|boolean}
 */
const decodeSymbol = (strict: boolean = false): number | boolean => {
  let byte1: number;
  let byte2: number;
  let byte3: number;
  let byte4: number;
  let codePoint: number;

  if (byteIndex > byteCount) {
    throw Error("Invalid byte index");
  }

  if (byteIndex === byteCount) {
    return false;
  }

  // Read first byte
  // tslint:disable-next-line: no-bitwise
  byte1 = byteArray[byteIndex] & 0xFF;
  byteIndex++;

  // 1-byte sequence (no continuation bytes)
  // tslint:disable-next-line: no-bitwise
  if ((byte1 & 0x80) === 0) {
    return byte1;
  }

  // 2-byte sequence
  // tslint:disable-next-line: no-bitwise
  if ((byte1 & 0xE0) === 0xC0) {
    byte2 = readContinuationByte();
    // tslint:disable-next-line: no-bitwise
    codePoint = ((byte1 & 0x1F) << 6) | byte2;
    if (codePoint >= 0x80) {
      return codePoint;
    } else {
      throw Error("Invalid continuation byte");
    }
  }

  // 3-byte sequence (may include unpaired surrogates)
  // tslint:disable-next-line: no-bitwise
  if ((byte1 & 0xF0) === 0xE0) {
    byte2 = readContinuationByte();
    byte3 = readContinuationByte();
    // tslint:disable-next-line: no-bitwise
    codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
    if (codePoint >= 0x0800) {
      return checkScalarValue(codePoint, strict) ? codePoint : 0xFFFD;
    } else {
      throw Error("Invalid continuation byte");
    }
  }

  // 4-byte sequence
  // tslint:disable-next-line: no-bitwise
  if ((byte1 & 0xF8) === 0xF0) {
    byte2 = readContinuationByte();
    byte3 = readContinuationByte();
    byte4 = readContinuationByte();
    // tslint:disable-next-line: no-bitwise
    codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
      // tslint:disable-next-line: no-bitwise
      (byte3 << 0x06) | byte4;
    if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
      return codePoint;
    }
  }

  throw Error("Invalid UTF-8 detected");
};

/**
 * @description: utf8 编码
 * @author: Quarter
 * @param {string} byteString 字节字符串
 * @param {UTF8Options} opts 配置项
 * @return {string}
 */
const utf8decode = (byteString: string, opts: UTF8Options = {}): string => {
  const strict = false !== opts.strict;

  byteArray = ucs2decode(byteString);
  byteCount = byteArray.length;
  byteIndex = 0;
  const codePoints: number[] = [];
  let tmp: number | boolean = decodeSymbol(strict);
  while (tmp !== false) {
    codePoints.push(tmp as number);
    tmp = decodeSymbol(strict);
  }
  return ucs2encode(codePoints);
};

export default {
  version: "2.1.2",
  encode: utf8encode,
  decode: utf8decode,
};