import { transform } from "@babel/core";
import emotionCssTransform from "../";

const cases = [
  {
    title: "Annotated #__PURE__",
    src: `<div css={{}} />`,
    dest: ``,
  },
];

function unPad(str: string) {
  return str.replace(/^\n+|\n+$/, "").replace(/\n+/g, "\n");
}

test("debug", () => {
  const src = transform(
    "<div css={{display:'block', color: 'red', fontSize: 12, fontWeight: 'bold'}} role='hello'>children</div>",
    {
      plugins: ["@babel/plugin-syntax-jsx", emotionCssTransform],
    },
  )!.code;

  console.log(src);
});

describe("test cases", () => {
  cases.forEach((caseItem) => {
    ((caseItem as any).only ? it.only : it)(caseItem.title, () => {
      const src = transform(caseItem.src, {
        plugins: ["@babel/plugin-syntax-jsx", emotionCssTransform],
      })!.code;

      const dest = transform(caseItem.dest, {
        plugins: ["@babel/plugin-syntax-dynamic-import"],
      })!.code;
      expect(unPad(src || "")).toEqual(unPad(dest || ""));
    });
  });
});
