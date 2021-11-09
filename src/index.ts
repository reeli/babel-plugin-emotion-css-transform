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
  objectProperty,
  memberExpression,
  isJSXAttribute,
  isJSXExpressionContainer,
  JSXAttribute,
  isObjectExpression,
  Expression,
  jsxAttribute,
  jsxIdentifier,
  jsxExpressionContainer,
  parenthesizedExpression,
  isMemberExpression,
  MemberExpression,
  isIdentifier,
  Identifier,
  isArrayExpression,
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

const createJsxAttribute = (
  name: string,
  value: Expression,
  wrapWithParenthesis = true,
) => {
  return jsxAttribute(
    jsxIdentifier(name),
    jsxExpressionContainer(
      arrowFunctionExpression(
        [identifier(constants.theme)],
        wrapWithParenthesis ? parenthesizedExpression(value!) : value,
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

const pickerAllIdentifierName = (data: MemberExpression) => {
  const res = [];

  if (isIdentifier(data.property)) {
    res.push(data.property.name);
  }

  const pick = (data: MemberExpression) => {
    const final = [];

    if (isIdentifier(data.object)) {
      final.unshift(data.object.name);
    }

    return final;
  };

  return [
    ...pick(isMemberExpression(data.object) ? data.object : data),
    ...res,
  ].join(".");
};

const handleCssProperties = (
  nodePath: NodePath<ObjectProperty>,
  keyPath: string,
  opts: { mapping: { [key: string]: any } },
) => {
  const name = (nodePath.node.key as any).name;
  const mapping = opts.mapping;

  if (mapping[keyPath]) {
    nodePath.replaceWith(
      objectProperty(
        identifier(name),
        createMemberExpression(mapping[keyPath]),
      ),
    );
  }
};

const hasSpecialIdentifier = (
  nodePath: NodePath<CallExpression>,
  name: string,
): boolean => {
  let flag = false;

  nodePath.traverse({
    Identifier: {
      enter(nodePath: NodePath<Identifier>) {
        if (nodePath.node.name === name) {
          flag = true;
        }
      },
    },
  });

  return flag;
};

export default () => ({
  name: "emotion-css-transform",
  visitor: {
    JSXAttribute: {
      enter(nodePath: NodePath<JSXAttribute>) {
        const attributeName = nodePath.node.name.name;
        const valueExpression = (nodePath.node?.value as any)?.expression;
        const isCssFnStyle = isCallExpression(valueExpression);
        const isObjectStyle = isObjectExpression(valueExpression);
        const isArrayStyle = isArrayExpression(valueExpression);

        if (
          isCss(attributeName) &&
          (isObjectStyle || isArrayStyle || isCssFnStyle)
        ) {
          nodePath.replaceWith(
            createJsxAttribute(attributeName, valueExpression, isObjectStyle),
          );
        }
      },
    },
    CallExpression: {
      exit(nodePath: NodePath<CallExpression>) {
        if (
          isCss((nodePath.node.callee as any).name) &&
          isVariableDeclarator(nodePath.parentPath?.node)
        ) {
          nodePath.replaceWith(
            arrowFunctionExpression(
              hasSpecialIdentifier(nodePath, constants.theme)
                ? [themeWithType]
                : [],
              nodePath.node,
            ),
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

        const parent: any = nodePath.findParent((path) =>
          isCallExpression(path),
        );
        const isExtractedCssObj = !!parent && isCss(parent.node.callee.name);

        if (isInlineCssObj || isExtractedCssObj) {
          if (isMemberExpression(nodePath.node.value)) {
            const keyPath = pickerAllIdentifierName(nodePath.node.value);
            if (!keyPath.startsWith(constants.theme)) {
              return handleCssProperties(nodePath, keyPath, opts);
            }
            return;
          }
        }
      },
    },
  } as Visitor,
});
