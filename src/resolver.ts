import { ASTNode, namedTypes as t, visit } from "ast-types";
import { resolver, utils } from "react-docgen";
import resolveHOC from "react-docgen/dist/utils/resolveHOC";

import { isStyledComponent } from "./utils";

interface Options {
  moduleName?: string;
}

export function createStyledResolvers({ moduleName }: Options = {}) {
  const exportTagged = (path: any, importer?: any) => {
    const definitions = utils.resolveExportDeclaration(path, importer) as any[];
    const components = [] as any[];

    definitions.filter(Boolean).forEach((def) => {
      let comp = def;
      if (isStyledComponent(comp, moduleName, importer)) {
        components.push(comp);
      } else {
        if (t.CallExpression.check(comp.node)) {
          const callee = comp.get("callee");

          if (
            utils.match(callee.node, {
              object: { name: "Object" },
              property: { name: "assign" },
            })
          ) {
            comp = comp.get("arguments", 0);
          }
        }
        comp = utils.resolveToValue(resolveHOC(comp, importer), importer);

        if (isStyledComponent(comp, moduleName, importer))
          components.push(comp);
      }
    });
    return components;
  };

  function findExportedStyledComponent(
    ast: ASTNode,
    _parser: any,
    importer: any
  ) {
    const components = [] as any[];

    const visitor = (path: any) => {
      components.push(...exportTagged(path, importer));
      return false;
    };

    visit(ast, {
      visitExportDefaultDeclaration: visitor,
    });

    return components;
  }

  function findAllExportedStyledComponents(
    ast: ASTNode,
    _parser: any,
    importer: any
  ) {
    const components = [] as any[];

    const visitor = (path: any) => {
      components.push(...exportTagged(path, importer));
      return false;
    };

    visit(ast, {
      visitExportDeclaration: visitor,
      visitExportNamedDeclaration: visitor,
      visitExportDefaultDeclaration: visitor,
    });
    return components;
  }

  function findAllStyledComponents(ast: ASTNode, _parser: any, importer: any) {
    const components = [] as any[];

    visit(ast, {
      visitTaggedTemplateExpression(path) {
        let comp = path;
        if (isStyledComponent(path, moduleName, importer)) {
          components.push(path);
        } else {
          comp = utils.resolveToValue(resolveHOC(path, importer), importer);

          if (isStyledComponent(comp, moduleName, importer))
            components.push(comp);
        }
        return false;
      },
    });
    return components;
  }

  return {
    findAllStyledComponents,
    findAllExportedStyledComponents,
    findExportedStyledComponent,
  };
}

const styledResolvers = createStyledResolvers();

export default (ast: ASTNode, parser: any, importer: any) => {
  const styled = styledResolvers.findAllExportedStyledComponents(
    ast,
    parser,
    importer
  );

  const exportedComponents = resolver.findAllExportedComponentDefinitions(
    ast,
    parser,
    importer
  );

  return styled.concat(exportedComponents);
};
