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
  Identifier,
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

const mapping: { [key: string]: string } = {
  fontSize: "theme.fontSize.color.red",
  radius: "theme.radius",
};

const createMemberExpression = (keyPath: string) => {
  const list = keyPath.split(".");
  const identifierList: Identifier[] = list.map((v) => identifier(v));

  return memberExpression(identifierList[0], identifierList[1]);
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
      enter(nodePath: NodePath<ObjectProperty>) {
        if (
          isCallExpression(nodePath?.parentPath?.parentPath?.node) &&
          isCss((nodePath?.parentPath?.parentPath?.node.callee as any).name) &&
          (isStringLiteral(nodePath.node.value) ||
            isNumericLiteral(nodePath.node.value))
        ) {
          const name = (nodePath.node.key as any).name;

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
