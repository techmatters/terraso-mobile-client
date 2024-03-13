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

import {Project, QuoteKind, Node} from 'ts-morph';

const countLibraryUsages = (library: string, project: Project) => {
  const usages: Record<string, [number, Set<String>]> = {};

  project.getSourceFiles().forEach(f => {
    const libImport = f.getImportDeclaration(
      d => d.getModuleSpecifier().getLiteralText() === library,
    );
    if (libImport !== undefined) {
      libImport.getNamedImports().forEach(s => {
        const identifier = s.getAliasNode() ?? s.getNameNode();
        const idUsages = identifier
          .findReferencesAsNodes()
          .filter(
            node =>
              Node.isJsxOpeningElement(node.getParent()) ||
              Node.isJsxSelfClosingElement(node.getParent()),
          );
        const files = new Set<string>();

        idUsages
          .map(usage => usage.getSourceFile().getFilePath())
          .forEach(file => files.add(file));

        usages[s.getName()] = [idUsages.length, files];
      });
    }
  });

  console.log(
    'total:',
    Object.values(usages)
      .map(([num]) => num)
      .reduce((a, b) => a + b),
  );
  console.log();
  Object.entries(usages)
    .sort(([, [a]], [, [b]]) => b - a)
    .forEach(([key, [num, files]]) => {
      console.log(`${key}:`, num);
      files.forEach(file => console.log(`  ${file}`));
    });
};

export const replaceNativeBaseUsages = (project: Project) => {
  const componentsToReplace = {
    Box: 'Box',
    Column: 'Column',
    Row: 'Row',
    HStack: 'Row',
    VStack: 'Column',
    View: 'View',
    Badge: 'Badge',
    Text: 'Text',
    Heading: 'Heading',
  };

  project.getSourceFiles().forEach(f => {
    const nbImport = f.getImportDeclaration(
      d => d.getModuleSpecifier().getLiteralText() === 'native-base',
    );
    if (nbImport === undefined) {
      return;
    }
    const toRemap = nbImport.getNamedImports().flatMap(s => {
      if (s.getName() in componentsToReplace) {
        const result = s.getName();
        s.remove();
        return [result];
      }
      return [];
    });
    if (nbImport.getNamedImports().length === 0) {
      nbImport.remove();
    }
    if (toRemap.length === 0) {
      return;
    }
    const ourImport = f.getImportDeclaration(
      d =>
        d.getModuleSpecifier().getLiteralText() ===
        'terraso-mobile-client/components/NativeBaseAdapters',
    );
    if (ourImport === undefined) {
      f.addImportDeclaration({
        moduleSpecifier: 'terraso-mobile-client/components/NativeBaseAdapters',
        namedImports: toRemap.map(s => ({name: s})),
      });
    } else {
      ourImport.addNamedImports(toRemap.map(s => ({name: s})));
    }
  });
};

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  manipulationSettings: {
    quoteKind: QuoteKind.Single,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
  },
});

countLibraryUsages('native-base', project);
