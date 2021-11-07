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
} from "@babel/types";
import { Visitor } from "@babel/core";

const createParamWithType = (name: string, type: string) => {
  const id = identifier(name);
  id.typeAnnotation = tsTypeAnnotation(tSTypeReference(identifier(type)));
  return id;
};

const createJsxAttribute = (name: string, value: Expression) => {
  const id = createParamWithType("theme", "Theme");

  return jsxAttribute(
    jsxIdentifier(name),
    jsxExpressionContainer(
      arrowFunctionExpression([id], parenthesizedExpression(value!)),
    ),
  );
};

export default () => ({
  name: "emotion-css-transform",
  visitor: {
    JSXAttribute: {
      enter(nodePath: NodePath<JSXAttribute>) {
        const attributeName = nodePath.node.name.name;
        const valueExpression = (nodePath.node.value as any).expression;

        if (attributeName === "css" && isObjectExpression(valueExpression)) {
          nodePath.replaceWith(
            createJsxAttribute(attributeName, valueExpression),
          );
        }
      },
    },
    CallExpression: {
      enter(nodePath: NodePath<CallExpression>) {
        if (
          (nodePath.node.callee as any).name === "css" &&
          isVariableDeclarator(nodePath.parentPath?.node)
        ) {
          const id = createParamWithType("theme", "Theme");

          nodePath.replaceWith(arrowFunctionExpression([id], nodePath.node));
        }
      },
    },
  } as Visitor,
});
