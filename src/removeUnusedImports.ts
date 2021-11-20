import { NodePath } from "@babel/traverse";
import { Visitor } from "@babel/core";
import { constants } from "./constants";

const filterModuleBindings = (nodePath: NodePath) => {
  const bindings = Object.values(nodePath.scope.bindings);
  return bindings.filter(
    (v) => v.kind === "module" && v.identifier.name !== constants.applyThemeFn,
  );
};

export default () => ({
  name: "emotion-css-transform-removeUnusedImports",
  visitor: {
    ImportDeclaration: {
      exit(nodePath) {
        const moduleBindings = filterModuleBindings(nodePath);

        moduleBindings.forEach((v) => {
          if (!v.referenced) {
            v.path.remove();

            if (
              v.path?.parentPath &&
              filterModuleBindings(v.path.parentPath).length == 0
            ) {
              v.path?.parentPath.remove();
            }
          }
        });
      },
    },
  } as Visitor,
});
