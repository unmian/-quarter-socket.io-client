/*
 * @Author: Quarter
 * @Date: 2021-12-29 07:29:06
 * @LastEditTime: 2022-05-06 03:24:27
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
      entry: resolve(__dirname, "../socket.io-client/index.ts"),
      name: "SocketIO",
      fileName: (format) => `index.${format}.js`,
    },
  },
  plugins: [
    dts({
      outputDir: "types",
      cleanVueFileName: true,
      include: ["socket.io-client/**"],
      beforeWriteFile: (filePath: string, content: string) => ({
        filePath: filePath.replace("types/socket.io-client", "types/"),
        content,
      }),
    }),
  ],
});