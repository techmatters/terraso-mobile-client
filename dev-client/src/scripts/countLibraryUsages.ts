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

import {Project, Node, QuoteKind} from 'ts-morph';

export const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  manipulationSettings: {
    quoteKind: QuoteKind.Single,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
  },
});

const library = 'native-base';

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
