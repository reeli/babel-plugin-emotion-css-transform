import { NodePath } from "@babel/traverse";
import {
  JSXAttribute,
  jsxExpressionContainer,
  arrowFunctionExpression,
  jsxAttribute,
  jsxIdentifier,
  isObjectExpression,
  Expression,
  identifier,
  tsTypeAnnotation,
  tSTypeReference,
  parenthesizedExpression,
  isVariableDeclarator,
  CallExpression,
  ObjectProperty,
  isCallExpression,
  isStringLiteral,
  objectProperty,
  memberExpression,
  isNumericLiteral,
} from "@babel/types";
import { Visitor } from "@babel/core";

const createParamWithType = (name: string, type: string) => {
  const id = identifier(name);
  id.typeAnnotation = tsTypeAnnotation(tSTypeReference(identifier(type)));
  return id;
};

const themeWithType = createParamWithType("theme", "Theme");

const createJsxAttribute = (name: string, value: Expression) => {
  return jsxAttribute(
    jsxIdentifier(name),
    jsxExpressionContainer(
      arrowFunctionExpression([themeWithType], parenthesizedExpression(value!)),
    ),
  );
};

const isCss = (name: unknown): name is string => name === "css";

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

export default () => ({
  name: "emotion-css-transform",
  visitor: {
    JSXAttribute: {
      enter(nodePath: NodePath<JSXAttribute>) {
        const attributeName = nodePath.node.name.name;
        const valueExpression = (nodePath.node.value as any).expression;

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
        if (
          isCallExpression(nodePath?.parentPath?.parentPath?.node) &&
          isCss((nodePath?.parentPath?.parentPath?.node.callee as any).name) &&
          (isStringLiteral(nodePath.node.value) ||
            isNumericLiteral(nodePath.node.value))
        ) {
          const name = (nodePath.node.key as any).name;
          const value = nodePath.node.value;
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

          if (mapping[name]) {
            nodePath.replaceWith(
              objectProperty(
                identifier(name),
                createMemberExpression(mapping[name]),
              ),
            );
          }
        }
      },
    },
  } as Visitor,
});
