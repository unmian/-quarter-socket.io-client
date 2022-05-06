/*
 * @Author: Quarter
 * @Date: 2021-12-29 07:29:06
 * @LastEditTime: 2022-05-06 06:13:51
 * @LastEditors: Quarter
 * @Description: vite 组件库配置
 * @FilePath: /socket.io-client/build/lib.config.ts
 */
import baseConfig from "./base.config";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  ...baseConfig,
  build: {
    outDir: "lib",
    lib: {
      entry: resolve(__dirname, "../index.ts"),
      name: "SocketIO",
      fileName: (format) => `index.${format}.js`,
    },
  },
  plugins: [
    dts({
      outputDir: "types",
      cleanVueFileName: true,
      include: [
        "engine.io-client/**",
        "engine.io-parser/**",
        "socket.io-client/**",
        "socket.io-parser/**",
        "utils/**",
        "index.ts",
      ],
    }),
  ],
});