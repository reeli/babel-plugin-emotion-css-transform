import { transform } from "@babel/core";
import emotionCssTransform from "../";

const cases = [
  {
    title: "Should handle inline css definition",
    src: `<div css={{fontSize: fonts.h1}} />`,
    dest: `<div css={theme => ({fontSize: theme.fontSize.h1})} />;`,
  },
  {
    title: "Should handle extracted css definition",
    src: `<div css={divStyles} />;const divStyles = css({fontSize: fonts.h1});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({fontSize: theme.fontSize.h1});`,
  },
  {
    title: "Should handle extracted css definition with color inside",
    src: `<div css={divStyles} />;const divStyles = css({color: colors.red});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({color: theme.color.primary});`,
  },
  {
    title:
      "Should handle the case when color is defined but not included in mapping",
    src: `<div css={divStyles} />;const divStyles = css({color: "#ccc"});`,
    dest: `<div css={divStyles} />;const divStyles = () => css({color: "#ccc"});`,
  },
  {
    title: "Should handle the case when origin color is defined by variable",
    src: `<div css={divStyles} />;const divStyles = css({color: colors.red});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({color: theme.color.primary});`,
  },
  {
    title:
      "Should handle the case when origin font size is defined by variable",
    src: `<div css={divStyles} />;const divStyles = css({fontSize: fonts.h1});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({fontSize: theme.fontSize.h1});`,
  },
  {
    title: "Should handle extracted merged css object",
    src: `<div css={divStyles} />;const divStyles = css({fontSize: fonts.h1}, customStyles, {color:"red"});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({fontSize: theme.fontSize.h1}, customStyles, {color: "red"});`,
  },
  {
    title: "Should handle extracted merged css object with css function and []",
    src: `<div css={divStyles} />;const divStyles = css(customStyles, [{ color: colors.red }]);`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css(customStyles, [{ color: theme.color.primary}]);`,
  },
  {
    title: "Should handle extracted merged css object with only []",
    src: `<div css={divStyles} />;const divStyles = css([{ color: colors.red }]);`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css([{ color: theme.color.primary}]);`,
  },
  {
    title: "Should handle inline merged css object",
    src: `<div css={css({color: colors.red}, customStyles)} />;`,
    dest: `<div css={theme => css({color: theme.color.primary}, customStyles)} />;`,
  },
  {
    title: "Should handle inline merged css object with css function and []",
    src: `<div css={css(customStyles, [{ color: colors.red }])} />`,
    dest: `<div css={theme => css(customStyles, [{ color: theme.color.primary}])} />;`,
  },
  {
    title: "Should handle extracted merged css object with only []",
    src: `<div css={[{ color: colors.red }]} />;`,
    dest: `<div css={theme => [{ color: theme.color.primary}]} />;`,
  },
  {
    title:
      "Should replace colors for everywhere if the colors variable is used",
    src: `<div css={{ background: colors.red, borderColor: colors.pink, fill: colors.blue  }} />;`,
    dest: `<div css={theme => ({ background: theme.color.primary, borderColor: theme.color.text.primary, fill: theme.color.secondary})} />;`,
  },
  {
    title: "Should handle shorthanded css values",
    src: "<div css={[{ border: `1px solid ${colors.pink}` }]} />;",
    dest: "<div css={theme => [{ border: `1px solid ${theme.color.text.primary}`}]} />;",
  },
  {
    title: "Should not throw error if the jsx attribute has no value",
    src: `<div isValid />`,
    dest: `<div isValid />;`,
  },
];

const mapping: { [key: string]: any } = {
  "fonts.h1": "theme.fontSize.h1",
  "fonts.text": "theme.fontSize.text",
  "fonts.title": "theme.fontSize.title",
  "colors.red": "theme.color.primary",
  "colors.blue": "theme.color.secondary",
  "colors.pink": "theme.color.text.primary",
  "radius.xs": "theme.radius.xs",
  "radius.sm": "theme.radius.sm",
};

function unPad(str: string) {
  return str
    .replace(/\n+|$/gi, "")
    .replace(/(\(\{)(\s+)/gi, "$1")
    .replace(/(\{)(\s+)/gi, "$1")
    .replace(/(\,)(\s+)/gi, "$1");
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
