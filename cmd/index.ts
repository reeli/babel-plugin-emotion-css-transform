import fg from "fast-glob";
import fs from "fs";
import { transform } from "@babel/core";
import emotionCssTransform from "../src";
import path from "path";

const source = ["demo/**/*.ts", "demo/**/*.tsx"];
const ignore = ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts"];

fg(source, {
  dot: true,
  ignore,
}).then((files) => {
  files.forEach((fileName) => transformFile(fileName));
});

const transformFile = (fileName: string) => {
  fs.readFile(fileName, (_, data) => {
    const content = data.toString("utf-8");
    const code = transform(content, {
      plugins: ["@babel/plugin-syntax-jsx", emotionCssTransform],
    })!.code;

    if (code) {
      fs.writeFile(path.resolve(process.cwd(), fileName), code, (err) => {
        console.log(err?.message);
      });
    }
  });
};
