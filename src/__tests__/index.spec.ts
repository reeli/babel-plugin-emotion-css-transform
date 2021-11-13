import { transform } from "@babel/core";
import emotionCssTransform from "../";

const cases = [
  {
    title: "Should handle inline css definition",
    src: `<div css={{fontSize: fonts.h1}} />`,
    dest: `<div css={theme => ({fontSize: theme.fontSize.h1})} />;`,
  },
  {
    title: "Should handle inline css without any matched theme",
    src: `<div css={{fontSize: 12}} />`,
    dest: `<div css={() => ({fontSize: 12})} />;`,
  },
  {
    title: "Should handle extracted css definition",
    src: `<div css={divStyles} />;const divStyles = css({fontSize: fonts.h1});`,
    dest: `<div css={divStyles} />;const divStyles = (theme: Theme) => css({fontSize: theme.fontSize.h1});`,
  },
  {
    title: "Multiple styles in one css function",
    src: `const divStyles = css({h1: {fontSize: fonts.h1}, h2: {color: colors.red}});`,
    dest: `const divStyles = (theme: Theme) => css({h1: {fontSize: theme.fontSize.h1}, h2: {color: theme.color.primary}});`,
  },
  {
    title: "Should handle obj.a",
    src: `const divStyles = css({fontSize: fonts.h1});`,
    dest: `const divStyles = (theme: Theme) => css({fontSize: theme.fontSize.h1});`,
  },
  {
    title: "Should handle obj['a']",
    src: `const divStyles = css({fontSize: fonts["h1"]});`,
    dest: `const divStyles = (theme: Theme) => css({fontSize: theme.fontSize.h1});`,
  },
  {
    title: "should handle obj['a'].b",
    src: `const divStyles = css({margin: spacing['common'].xs});`,
    dest: `const divStyles = (theme: Theme) => css({margin: theme.spacing.xs});`,
  },
  {
    title: "should handle obj.a.b",
    src: `const divStyles = css({margin: spacing.common.xs});`,
    dest: `const divStyles = (theme: Theme) => css({margin: theme.spacing.xs});`,
  },
  {
    title: "should handle obj['a']['b']",
    src: `const divStyles = css({margin: spacing['common']['xs']});`,
    dest: `const divStyles = (theme: Theme) => css({margin: theme.spacing.xs});`,
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
    dest: `import applyTheme from "src/test.ts"; <div css={divStyles} />;const divStyles = applyTheme({fontSize: theme.fontSize.h1}, customStyles, {color: "red"});`,
  },
  {
    title: "Should handle extracted merged css object with css function and []",
    src: `<div css={divStyles} />;const divStyles = css(customStyles, [{ color: colors.red }]);`,
    dest: `import applyTheme from "src/test.ts"; <div css={divStyles} />;const divStyles = applyTheme(customStyles, [{ color: theme.color.primary}]);`,
  },
  {
    title: "Should handle extracted merged css object with only []",
    src: `<div css={divStyles} />;const divStyles = css([{ color: colors.red }]);`,
    dest: `import applyTheme from "src/test.ts"; <div css={divStyles} />;const divStyles = applyTheme([{ color: theme.color.primary}]);`,
  },
  {
    title: "Should handle inline merged css object",
    src: `<div css={css({color: colors.red}, customStyles)} />;`,
    dest: `import applyTheme from "src/test.ts"; <div css={applyTheme({color: theme.color.primary}, customStyles)} />;`,
  },
  {
    title: "Should handle inline merged css object with css function and []",
    src: `<div css={css(customStyles, [{ color: colors.red }])} />`,
    dest: `import applyTheme from "src/test.ts"; <div css={applyTheme(customStyles, [{ color: theme.color.primary}])} />;`,
  },
  {
    title: "Should handle extracted merged css object with only []",
    src: `<div css={[{ color: colors.red }]} />;`,
    dest: `import applyTheme from "src/test.ts"; <div css={applyTheme({ color: theme.color.primary})} />;`,
  },
  {
    title:
      "Should replace colors for everywhere if the colors variable is used",
    src: `<div css={{ background: colors.red, borderColor: colors.pink, fill: colors.blue  }} />;`,
    dest: `<div css={theme => ({ background: theme.color.primary, borderColor: theme.color.text.primary, fill: theme.color.secondary})} />;`,
  },
  {
    title: "Should handle TemplateLiteral css values",
    src: "<div css={customStyles} />;const customStyles = css({ backgroundImage: `url(${someUrl}), linear-gradient(top top right, ${colors.blue},${colors.red})` });",
    dest: "<div css={customStyles} />;const customStyles = (theme: Theme) => css({ backgroundImage: `url(${someUrl}), linear-gradient(top top right, ${theme.color.secondary},${theme.color.primary})`});",
  },
  {
    title: "Should handle shorthanded css values",
    src: "<div css={[{ border: `1px solid ${colors.pink}` }]} />;",
    dest: 'import applyTheme from "src/test.ts"; <div css={applyTheme({ border: `1px solid ${theme.color.text.primary}`})} />;',
  },
  {
    title: "Should handle inline theme function",
    src: "<div css={(theme: Theme) => ({color: theme.colors.pink, background: colors.red})} />;",
    dest: "<div css={(theme: Theme) => ({color: theme.colors.pink, background: theme.color.primary})} />;",
  },
  {
    title: "Should multiple css fn in one object",
    src: `
      const buttonStyleVariant = {orange: css({color: colors.red}), pink: css({color: colors.pink})};
  `,
    dest: `
      const buttonStyleVariant = {
        orange: (theme: Theme) => css({color: theme.color.primary}),
        pink: (theme: Theme) => css({color: theme.color.text.primary}) 
      };
  `,
  },
  {
    title: "Should handle css with variable",
    src: `
      const buttonStyles = variant ? css(basicButtonStyles, buttonStyleVariant[variant]): basicButtonStyles;
  `,
    dest: `
      import applyTheme from "src/test.ts"; const buttonStyles = variant ? applyTheme(basicButtonStyles, buttonStyleVariant[variant]): basicButtonStyles;
  `,
  },
  {
    title: "extracted css object",
    src: `const containerStyles = css({color: colors.red});`,
    dest: `const containerStyles = (theme: Theme) => css({color: theme.color.primary});`,
  },
  // {
  //   title: "extracted css object",
  //   src: `<div contentStyle={css({width: 120})}>test</div>;`,
  //   dest: `<div contentStyle={css({width: 120})}>test</div>`,
  // },
  {
    title: "should import applyTheme fn to current file",
    src: `const libStyles = css(inputStyles, styles);`,
    dest: `import applyTheme from "src/test.ts"; const libStyles = applyTheme(inputStyles, styles);`,
  },
  {
    title: "should import applyTheme fn to the top of the file",
    src: `import aaa from "src/aaa.ts"; const libStyles = css(inputStyles, styles);`,
    dest: `import applyTheme from "src/test.ts"; import aaa from "src/aaa.ts"; const libStyles = applyTheme(inputStyles, styles);`,
  },
  {
    title:
      "should not import applyTheme fn if current file already imported applyTheme function",
    src: `import applyTheme from "src/test.ts"; import bbb from "src/bbb.ts"; const libStyles = css(inputStyles, styles);`,
    dest: `import applyTheme from "src/test.ts"; import bbb from "src/bbb.ts";  const libStyles = applyTheme(inputStyles, styles);`,
  },
  {
    title: "extracted css object",
    src: `const libStyles = css([inputStyles, styles]);`,
    dest: `const libStyles = applyTheme(inputStyles, styles);`,
  },
  {
    title: "inline css array",
    src: `<div css={[inputStyles, styles]}>test</div>;`,
    dest: `import applyTheme from "src/test.ts"; <div css={applyTheme(inputStyles, styles)}>test</div>;`,
  },
  {
    title: "Should handle css with variable",
    src: `
      const buttonStyleVariant = {orange: css({fontSize: fonts.h1})};
      const buttonStyles = variant ? css(basicButtonStyles, buttonStyleVariant[variant]): basicButtonStyles;
      <div css={css(buttonStyles, disabled ? disableButtonStyles: null)} />;
  `,
    dest: `
      import applyTheme from "src/test.ts";
      const buttonStyleVariant = {orange: (theme: Theme) => css({fontSize: theme.fontSize.h1})};
      const buttonStyles = variant ? applyTheme(basicButtonStyles, buttonStyleVariant[variant]): basicButtonStyles;
      <div css={applyTheme(buttonStyles, disabled ? disableButtonStyles: null)} />;
  `,
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
  "spacing.common.xs": "theme.spacing.xs",
};

function unPad(str: string) {
  return str.replace(/\s+/gi, "");
}

describe("test cases", () => {
  cases.forEach((caseItem) => {
    ((caseItem as any).only ? it.only : it)(caseItem.title, () => {
      const src = transform(caseItem.src, {
        plugins: [
          ["@babel/plugin-syntax-typescript", { isTSX: true }],
          [emotionCssTransform, { mapping }],
        ],
      })!.code;

      expect(unPad(src!)).toEqual(unPad(caseItem.dest));
    });
  });
});
