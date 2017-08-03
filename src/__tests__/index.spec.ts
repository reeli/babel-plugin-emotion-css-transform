import { transform } from "babel-core"
import pluginAnnotatePureCallInVariableDeclarator from "../"

const cases = [{
  title: "Annotated #__PURE__",
  src: `const A = String("a");`,
  dest: `const A = /*#__PURE__*/String("a");`,
}, {
  title: "Skip annotated #__PURE__ when already have",
  src: `const A = /*#__PURE__*/String("a");`,
  dest: `const A = /*#__PURE__*/String("a");`,
}, {
  title: "Annotated #__PURE__ with other comments",
  src: `const A = /*other comments*/String("a");`,
  dest: `const A = /*other comments*/ /*#__PURE__*/String("a");`,
}, {
  title: "Annotated #__PURE__ when export",
  src: `export const A = String("a");`,
  dest: `export const A = /*#__PURE__*/String("a");`,
}, {
  title: "Annotated #__PURE__ for IIFE",
  src: `export const A = (() => "a")();`,
  dest: `export const A = /*#__PURE__*/(() => "a")();`,
}]

function unPad(str: string) {
  return str.replace(/^\n+|\n+$/, "").replace(/\n+/g, "\n")
}

describe("test cases", () => {
  cases.forEach((caseItem) => {
    it(caseItem.title, () => {
      const code = transform(caseItem.src, {
        plugins: [
          pluginAnnotatePureCallInVariableDeclarator,
        ],
      }).code
      expect(unPad(code || "")).toEqual(unPad(caseItem.dest))
    })
  })
})
