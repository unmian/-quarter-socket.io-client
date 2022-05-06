/*
 * @Author: Quarter
 * @Date: 2022-04-27 05:57:09
 * @LastEditTime: 2022-05-05 13:07:23
 * @LastEditors: Quarter
 * @Description: 解析 URI 工具
 * @FilePath: /socket.io-client/utils/parseuri.ts
 */

// uri 正则
const re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
// 参数列表
const paramList: ParamItem[] = [
  "source",
  "protocol",
  "authority",
  "userInfo",
  "user",
  "password",
  "host",
  "port",
  "relative",
  "path",
  "directory",
  "file",
  "query",
  "anchor",
];

// 参数项
type ParamItem = "anchor" |
  "authority" |
  "directory" |
  "file" |
  "host" |
  "password" |
  "path" |
  "port" |
  "protocol" |
  "query" |
  "relative" |
  "source" |
  "user" |
  "userInfo";

// URI 解析结果
export type URIParseResult = {
  [key in ParamItem]: string;
} & {
  ipv6uri: boolean; // 是否是 ipv6 地址
  pathNames: string[]; // 路径名列表
  queryKey: QueryList; // 查询参数
};

// 查询参数列表
interface QueryList {
  [key: string]: string;
}

/**
 * @description: 解析 URI
 * @author: Quarter
 * @param {string} str 字符串
 * @return {URIParseResult}
 */
const parseuri = (str: string): URIParseResult => {
  const uri: URIParseResult = {
    anchor: "",
    authority: "",
    directory: "",
    file: "",
    host: "",
    ipv6uri: false,
    password: "",
    path: "/",
    pathNames: [],
    port: "",
    protocol: "",
    query: "",
    queryKey: {},
    relative: "",
    source: "",
    user: "",
    userInfo: "",
  };

  const src = str;
  const b = str.indexOf("[");
  const e = str.indexOf("]");
  // 如果存在 []
  if (b !== -1 && e !== -1) {
    str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
  }

  // 参数列表取值
  const m = re.exec(str || "");
  if (null !== m) {
    paramList.forEach((param, index) => {
      uri[param] = m[index] || "";
    });
  }
  if (b !== -1 && e !== -1) {
    uri.source = src;
    uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
    uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
    uri.ipv6uri = true;
  }

  uri.pathNames = parsePathNames(uri.path);
  uri.queryKey = parseQueryKey(uri.query);

  return uri;
};

/**
 * @description: 解析路径名称
 * @author: Quarter
 * @param {string} path 路径字符串
 * @return {string[]}
 */
const parsePathNames = (path: string): string[] => {
  const regx = /\/{2,9}/g;
  const names = path.replace(regx, "/").split("/");

  if (path.substring(0, 1) === "/" || path.length === 0) {
    names.splice(0, 1);
  }
  if (path.substring(path.length - 1, 1) === "/") {
    names.splice(names.length - 1, 1);
  }

  return names;
};

/**
 * @description: 解析参数列表
 * @author: Quarter
 * @param {string} query 参数字符串
 * @return {QueryList}
 */
const parseQueryKey = (query: string): QueryList => {
  const data: QueryList = {};

  query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, ($0: string, $1: string, $2: string) => {
    if ($1) {
      data[$1] = $2;
    }
    return $0;
  });

  return data;
};

export default parseuri;