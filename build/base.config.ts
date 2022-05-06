/*
 * @Author: Quarter
 * @Date: 2022-05-05 08:54:35
 * @LastEditTime: 2022-05-05 08:54:50
 * @LastEditors: Quarter
 * @Description: 基本配置
 * @FilePath: /socket.io-client/build/base.config.ts
 */
import { resolve } from "path";
import { defineConfig } from "vite";

// 文档: https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "socket.io-client": resolve(__dirname, "../socket.io-client"),
      "socket.io-parser": resolve(__dirname, "../socket.io-parser"),
      "engine.io-client": resolve(__dirname, "../engine.io-client"),
      "engine.io-parser": resolve(__dirname, "../engine.io-parser"),
      lib: resolve(__dirname, "../lib"),
      utils: resolve(__dirname, "../utils"),
    },
  },
});