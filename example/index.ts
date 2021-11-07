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

const mapping: { [key: string]: any } = {
  fontSize: "theme.fontSize.color.red",
  radius: "theme.radius",
  color: {
    red: "theme.color.primary",
    blue: "theme.color.secondary",
    pink: "theme.color.text.primary",
    "colors.red": "theme.color.red",
  },
};

const transformFile = (fileName: string) => {
  fs.readFile(fileName, (_, data) => {
    const content = data.toString("utf-8");
    // Should not handle the content ff the file is empty
    if (!content) {
      return;
    }
    const code = transform(content, {
      plugins: ["@babel/plugin-syntax-jsx", [emotionCssTransform, { mapping }]],
    })!.code;

    if (code) {
      fs.writeFile(path.resolve(process.cwd(), fileName), code, (err) => {
        console.log(err?.message);
      });
    }
  });
};
