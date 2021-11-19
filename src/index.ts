import { NodePath } from "@babel/traverse";
import {
  arrowFunctionExpression,
  identifier,
  tsTypeAnnotation,
  tSTypeReference,
  CallExpression,
  isCallExpression,
  memberExpression,
  isJSXAttribute,
  JSXAttribute,
  isObjectExpression,
  Expression,
  jsxAttribute,
  jsxIdentifier,
  jsxExpressionContainer,
  parenthesizedExpression,
  isMemberExpression,
  MemberExpression,
  Identifier,
  isArrayExpression,
  isArrowFunctionExpression,
  callExpression,
  importDeclaration,
  stringLiteral,
  importDefaultSpecifier,
} from "@babel/types";
import { Visitor } from "@babel/core";

const constants = {
  theme: "theme",
  ThemeType: "Theme",
  css: "css",
  applyThemeFn: "applyTheme",
  shouldApplyTheme: "shouldApplyTheme",
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
  flag?: boolean,
) => {
  return jsxAttribute(
    jsxIdentifier(name),
    jsxExpressionContainer(
      arrowFunctionExpression(
        flag ? [identifier(constants.theme)] : [],
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

const pickerAllIdentifierName = (node: MemberExpression): string[] => {
  const obj = (node.object as Identifier)?.name || (node.object as any)?.value;
  const prop =
    (node.property as Identifier).name || (node.property as any).value;

  if (isMemberExpression(node.object)) {
    return [...pickerAllIdentifierName(node.object), prop];
  }

  return [obj, prop];
};

interface PluginOptions {
  mapping: { [key: string]: any };
  applyThemePath: string;
}

const handleMemberExpression = (
  nodePath: NodePath<MemberExpression>,
  keyPath: string,
  opts: PluginOptions,
) => {
  const mapping = opts.mapping;

  if (mapping[keyPath]) {
    nodePath.replaceWith(createMemberExpression(mapping[keyPath]));
  }
};

const hasSpecialIdentifier = (
  nodePath: NodePath<CallExpression | JSXAttribute>,
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

const onlyObjectExpression = (list: any[]) =>
  list.every((v) => isObjectExpression(v));

export default () => ({
  name: "emotion-css-transform",
  visitor: {
    Program: {
      exit(root: NodePath, state: any) {
        if (
          state.get(constants.shouldApplyTheme) &&
          !root.scope.hasBinding(constants.applyThemeFn)
        ) {
          root.unshiftContainer(
            // @ts-ignore
            "body",
            importDeclaration(
              [importDefaultSpecifier(identifier(constants.applyThemeFn))],
              stringLiteral(state.opts.applyThemePath),
            ),
          );
        }
      },
    },
    JSXAttribute: {
      exit(nodePath: NodePath<JSXAttribute>, state: any) {
        const attributeName = nodePath.node.name.name;
        const valueExpression = (nodePath.node?.value as any)?.expression;
        const isFnStyle =
          isCallExpression(valueExpression) &&
          (valueExpression?.callee as any)?.name !== constants.applyThemeFn;

        const isObjectStyle = isObjectExpression(valueExpression);
        const isArrayStyle = isArrayExpression(valueExpression);

        if (isCss(attributeName)) {
          if (isObjectStyle || isFnStyle) {
            const flag = hasSpecialIdentifier(nodePath, constants.theme);
            nodePath.replaceWith(
              createJsxAttribute(
                attributeName,
                valueExpression,
                isObjectStyle,
                flag,
              ),
            );
            return;
          }

          if (isArrayStyle) {
            state.set(constants.shouldApplyTheme, true);

            nodePath.replaceWith(
              jsxAttribute(
                jsxIdentifier(attributeName),
                jsxExpressionContainer(
                  callExpression(
                    identifier(constants.applyThemeFn),
                    valueExpression.elements as any,
                  ),
                ),
              ),
            );

            return;
          }
        }
      },
    },
    CallExpression: {
      exit(nodePath: NodePath<CallExpression>, state: any) {
        if (
          isCss((nodePath.node.callee as any).name) &&
          !isArrowFunctionExpression(nodePath.parentPath.node)
        ) {
          if (onlyObjectExpression(nodePath.node.arguments)) {
            nodePath.replaceWith(
              arrowFunctionExpression(
                hasSpecialIdentifier(nodePath, constants.theme)
                  ? [themeWithType]
                  : [],
                nodePath.node,
              ),
            );
            return;
          }

          state.set(constants.shouldApplyTheme, true);

          nodePath.replaceWith(
            callExpression(
              identifier(constants.applyThemeFn),
              nodePath.node.arguments,
            ),
          );
        }
      },
    },
    MemberExpression: {
      enter(nodePath: NodePath<MemberExpression>, { opts }: any) {
        const jsxAttribute = nodePath.findParent((path) =>
          isJSXAttribute(path),
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
          const keyPath = pickerAllIdentifierName(nodePath.node).join(".");
          if (!keyPath.startsWith(constants.theme)) {
            return handleMemberExpression(nodePath, keyPath, opts);
          }
        }
      },
    },
  } as Visitor,
});
