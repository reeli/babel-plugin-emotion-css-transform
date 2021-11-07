import { NodePath } from "@babel/traverse";
import {
  arrowFunctionExpression,
  identifier,
  tsTypeAnnotation,
  tSTypeReference,
  isVariableDeclarator,
  CallExpression,
  ObjectProperty,
  isCallExpression,
  isStringLiteral,
  objectProperty,
  memberExpression,
  isNumericLiteral,
  isJSXAttribute,
  isJSXExpressionContainer,
  StringLiteral,
  NumericLiteral,
  JSXAttribute,
  isObjectExpression,
  Expression,
  jsxAttribute,
  jsxIdentifier,
  jsxExpressionContainer,
  parenthesizedExpression,
} from "@babel/types";
import { Visitor } from "@babel/core";

const constants = {
  theme: "theme",
  ThemeType: "Theme",
  css: "css",
};

const createParamWithType = (name: string, type: string) => {
  const id = identifier(name);
  id.typeAnnotation = tsTypeAnnotation(tSTypeReference(identifier(type)));
  return id;
};

const themeWithType = createParamWithType(constants.theme, constants.ThemeType);

const createJsxAttribute = (name: string, value: Expression) => {
  return jsxAttribute(
    jsxIdentifier(name),
    jsxExpressionContainer(
      arrowFunctionExpression(
        [identifier(constants.theme)],
        parenthesizedExpression(value!),
      ),
    ),
  );
};

const isCss = (name: unknown): name is string => name === constants.css;

const createMemberExpression = (keyPath: string) => {
  const list = keyPath.split(".");

  const fn = (data: string[]): any => {
    const lastItem = data[data.length - 1];
    const itemsWithoutLast = data.filter(
      (_, idx: number) => idx < data.length - 1,
    );

    if (itemsWithoutLast.length === 1) {
      return memberExpression(
        identifier(itemsWithoutLast[0]),
        identifier(lastItem),
      );
    }

    return memberExpression(fn(itemsWithoutLast), identifier(lastItem));
  };

  return fn(list);
};

const handleCssProperties = (
  nodePath: NodePath<ObjectProperty>,
  opts: { mapping: { [key: string]: any } },
) => {
  const name = (nodePath.node.key as any).name;
  const value = nodePath.node.value as StringLiteral | NumericLiteral;
  const mapping = opts.mapping;

  if (name === "color" && mapping[name][value.value]) {
    nodePath.replaceWith(
      objectProperty(
        identifier(name),
        createMemberExpression(mapping[name][value.value]),
      ),
    );
    return;
  }

  if (name !== "color" && mapping[name]) {
    nodePath.replaceWith(
      objectProperty(identifier(name), createMemberExpression(mapping[name])),
    );
  }
};

export default () => ({
  name: "emotion-css-transform",
  visitor: {
    JSXAttribute: {
      enter(nodePath: NodePath<JSXAttribute>) {
        const attributeName = nodePath.node.name.name;
        const valueExpression = (nodePath.node?.value as any)?.expression;

        if (isCss(attributeName) && isObjectExpression(valueExpression)) {
          nodePath.replaceWith(
            createJsxAttribute(attributeName, valueExpression),
          );
        }
      },
    },
    CallExpression: {
      enter(nodePath: NodePath<CallExpression>) {
        if (
          isCss((nodePath.node.callee as any).name) &&
          isVariableDeclarator(nodePath.parentPath?.node)
        ) {
          nodePath.replaceWith(
            arrowFunctionExpression([themeWithType], nodePath.node),
          );
        }
      },
    },
    ObjectProperty: {
      enter(nodePath: NodePath<ObjectProperty>, { opts }: any) {
        const jsxAttribute = nodePath.findParent((path) =>
          isJSXAttribute(path),
        );

        const jsxExpressionContainer = nodePath.findParent((path) =>
          isJSXExpressionContainer(path),
        );

        const isInlineCssObj =
          jsxAttribute &&
          isCss((jsxAttribute.node as any).name.name) &&
          jsxExpressionContainer;

        const isExtractedCssObj =
          isCallExpression(nodePath?.parentPath?.parentPath?.node) &&
          isCss((nodePath?.parentPath?.parentPath?.node.callee as any).name);

        const isStringOrNumberValue =
          isStringLiteral(nodePath.node.value) ||
          isNumericLiteral(nodePath.node.value);

        if ((isInlineCssObj || isExtractedCssObj) && isStringOrNumberValue) {
          handleCssProperties(nodePath, opts);
        }
      },
    },
  } as Visitor,
});
