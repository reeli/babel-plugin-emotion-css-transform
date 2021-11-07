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
        const valueExpression = (nodePath.node.value as any).expression;
        if (
          nodePath.node.name.name === "css" &&
          isObjectExpression(valueExpression)
        ) {
          nodePath.replaceWith(
            createJsxAttribute(nodePath.node.name.name, valueExpression),
          );
        }
      },
    },
  } as Visitor,
});
