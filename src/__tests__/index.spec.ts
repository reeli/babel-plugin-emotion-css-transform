import { transform } from "@babel/core";
import emotionCssTransform from "../";

const cases = [
  {
    title: "Should handle inline css definition",
    src: `<div css={{fontSize: 12}} />`,
    dest: `<div css={theme => ({fontSize: theme.fontSize})} />;`,
  },
  {
    title: "Should handle extracted css definition",
    src: `<div css={divStyles} />;const divStyles = css({fontSize: 12});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({fontSize: theme.fontSize});`,
  },
  {
    title: "Should handle extracted css definition",
    src: `<div css={divStyles} />;const divStyles = css({fontSize: 12});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({fontSize: theme.fontSize});`,
  },
  {
    title: "Should not throw error if the jsx attribute has no value",
    src: `<div isValid />`,
    dest: `<div isValid />;`,
  },
];

const mapping: { [key: string]: any } = {
  fontSize: "theme.fontSize",
  radius: "theme.radius",
  color: {
    red: "theme.colors.primary",
    blue: "theme.colors.secondary",
    pink: "theme.colors.text.primary",
  },
};

function unPad(str: string) {
  return str.replace(/\n+|$/gi, "").replace(/(\(\{)(\s+)/gi, "$1");
}

describe("test cases", () => {
  cases.forEach((caseItem) => {
    ((caseItem as any).only ? it.only : it)(caseItem.title, () => {
      const src = transform(caseItem.src, {
        plugins: [
          "@babel/plugin-syntax-jsx",
          [emotionCssTransform, { mapping }],
        ],
      })!.code;

      expect(unPad(src!)).toEqual(unPad(caseItem.dest));
    });
  });
});
