/*
 * Copyright © 2024 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {Node, Project, QuoteKind, StructureKind} from 'ts-morph';

export const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  manipulationSettings: {
    quoteKind: QuoteKind.Single,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
  },
});

type ImportMigration = {
  oldModule: string;
  oldImport: string;
  newModule: string;
  newImport: string;
};

const componentMap: ImportMigration[] = [
  {
    oldModule: 'terraso-mobile-client/components/NativeBaseAdapters',
    oldImport: 'Box',
    newModule: 'terraso-mobile-client/components/core/Box',
    newImport: 'Box',
  },
  {
    oldModule: 'terraso-mobile-client/components/NativeBaseAdapters',
    oldImport: 'Text',
    newModule: 'terraso-mobile-client/components/core/Text',
    newImport: 'Text',
  },
  {
    oldModule: 'terraso-mobile-client/components/NativeBaseAdapters',
    oldImport: 'Heading',
    newModule: 'terraso-mobile-client/components/core/Text',
    newImport: 'Text',
  },
] as const;

const attrMap: Record<string, string> = {
  mr: 'marginRight',
  mb: 'marginBottom',
  mt: 'marginTop',
  ml: 'marginLeft',
  mx: 'marginHorizontal',
  my: 'marginVertical',
  m: 'margin',
  pr: 'paddingRight',
  pb: 'paddingBottom',
  pt: 'paddingTop',
  pl: 'paddingLeft',
  px: 'paddingHorizontal',
  py: 'paddingVertical',
  p: 'padding',
  h: 'height',
  w: 'width',
  bg: 'backgroundColor',
  bgColor: 'backgroundColor',
};

project.getSourceFiles().forEach(file => {
  file.getImportDeclarations().forEach(oldDeclaration => {
    const toRemap = componentMap.filter(
      ({oldModule}) =>
        oldModule === oldDeclaration.getModuleSpecifier().getLiteralText(),
    );

    oldDeclaration.getNamedImports().forEach(oldImport => {
      const thisMapping = toRemap.find(
        ({oldImport: oldImportName}) => oldImportName === oldImport.getName(),
      );
      if (thisMapping === undefined) {
        return;
      }
      const {newModule, newImport} = thisMapping;

      const ourImport = file.getImportDeclaration(
        d => d.getModuleSpecifier().getLiteralText() === newModule,
      );

      if (ourImport === undefined) {
        file.addImportDeclaration({
          moduleSpecifier: newModule,
          namedImports: [newImport],
        });
      } else {
        if (
          !ourImport.getNamedImports().find(imp => imp.getName() === newImport)
        ) {
          ourImport.addNamedImports([newImport]);
        }
      }

      const identifier = oldImport.getAliasNode() ?? oldImport.getNameNode();
      identifier.findReferencesAsNodes().forEach(usage => {
        usage.replaceWithText(newImport);
      });

      oldImport.remove();

      if (oldDeclaration.getNamedImports().length === 0) {
        oldDeclaration.remove();
      }
    });
  });
});

project.getSourceFiles().forEach(file => {
  componentMap.forEach(({newModule, newImport}) => {
    const declaration = file.getImportDeclaration(
      decl => decl.getModuleSpecifier().getLiteralText() === newModule,
    );
    if (!declaration) {
      return;
    }

    const imp = declaration
      .getNamedImports()
      .find(i => i.getName() === newImport);

    if (!imp) {
      return;
    }
    const identifier = imp.getAliasNode() ?? imp.getNameNode();

    identifier.findReferencesAsNodes().forEach(usage => {
      const parent = usage.getParent();
      if (
        !Node.isJsxOpeningElement(parent) &&
        !Node.isJsxSelfClosingElement(parent)
      ) {
        return;
      }
      if (identifier.getText() === 'Text') {
        if (!parent.getAttribute('variant')) {
          parent.addAttribute({
            kind: StructureKind.JsxAttribute,
            name: 'variant',
            initializer: '"body1"',
          });
        }
        if (parent.getAttribute('bold')) {
          parent.getAttribute('bold')?.remove();
          const attr = parent.getAttribute('variant')!;
          if (!Node.isJsxAttribute(attr)) {
            throw new Error();
          }
          attr.setInitializer('"body1-strong"');
        }
        if (parent.getAttribute('italic')) {
          parent.getAttribute('italic')?.remove();
          parent.addAttribute({
            kind: StructureKind.JsxAttribute,
            name: 'fontStyle',
            initializer: '"italic"',
          });
        }
      }
      parent.getAttributes().forEach(attr => {
        if (!Node.isJsxAttribute(attr)) {
          return;
        }
        const attrName = attr.getNameNode().getText();
        if (attrName in attrMap) {
          attr.getNameNode().replaceWithText(attrMap[attrName]);
        }
        const initializer = attr.getInitializer();
        if (!Node.isStringLiteral(initializer)) {
          return;
        }
        const text = initializer.getLiteralText();
        if (!text.endsWith('px')) {
          return;
        }
        attr.setInitializer(`{${text.substring(0, text.length - 2)}}`);
      });
    });
  });
});

project.save();
