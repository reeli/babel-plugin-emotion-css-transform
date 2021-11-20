import fg from "fast-glob";
import fs from "fs";
import { transform } from "@babel/core";
import path from "path";

const source = ["demo/**/*.ts", "demo/**/*.tsx"];
const ignore = ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts"];
const mapping: { [key: string]: any } = {
  fontSize: "theme.fontSize.color.red",
  radius: "theme.radius",
  color: {
    red: "theme.color.primary",
    blue: "theme.color.secondary",
    pink: "theme.color.text.primary",
  },
};

fg(source, {
  dot: true,
  ignore,
}).then((files) => {
  files.forEach((fileName) => transformFile(fileName));
});

const transformFile = (fileName: string) => {
  fs.readFile(fileName, (_, data) => {
    const content = data.toString("utf-8");
    // Should not handle the content ff the file is empty
    if (!content) {
      return;
    }

    const code = transform(content, {
      babelrc: false,
      generatorOpts: {
        retainLines: true,
        retainFunctionParens: true,
        comments: true,
      },
      plugins: [
        ["@babel/plugin-syntax-typescript", { isTSX: true }],
        [
          "babel-plugin-emotion-css-transform",
          { mapping, applyThemeFn: "src/applyThemePath.ts" },
        ],
      ],
    })!.code;

    if (code) {
      fs.writeFile(path.resolve(process.cwd(), fileName), code, (err) => {
        if (err) {
          console.log(err?.message);
        }
      });
    }
  });
};
