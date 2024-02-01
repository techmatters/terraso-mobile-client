import {Project, QuoteKind} from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  manipulationSettings: {
    quoteKind: QuoteKind.Single,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
  },
});

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

project.saveSync();

// const walk = (p: string): string[] => {
//   if (fs.lstatSync(p).isDirectory()) {
//     return fs.readdirSync(p).flatMap(np => walk(`${p}/${np}`));
//   } else {
//     return [p];
//   }
// };

// const printer = ts.createPrinter();

// const textComponents = {
//   Text: 'Text',
//   Heading: 'Text',
// };

// const imports: string[] = [];

// const files = walk(path.resolve('src')).filter(p => p.endsWith('.tsx'));
// const program = ts.createProgram(files, {});
// program.getSourceFiles().map(source => {
//   const transformed = ts.transform(source, [
//     context => node =>
//       ts.visitEachChild(
//         node,
//         imp => {
//           if (!ts.isImportDeclaration(imp)) {
//             return imp;
//           }
//           if (!ts.isStringLiteral(imp.moduleSpecifier)) {
//             return imp;
//           }
//           if (imp.moduleSpecifier.text !== 'native-base') {
//             return imp;
//           }
//           if (!imp.importClause?.namedBindings) {
//             return;
//           }
//           if (!ts.isNamedImports(imp.importClause.namedBindings)) {
//             return;
//           }

//           const nbImports: string[] = [];
//           const remainingBindings = ts.visitEachChild(
//             imp.importClause.namedBindings,
//             binding => {
//               if (!ts.isImportSpecifier(binding)) {
//                 return binding;
//               }
//               if (binding.name.text in layoutComponents) {
//                 nbImports.push(binding.name.text);
//                 return undefined;
//               }
//               return binding;
//             },
//             context,
//           );

//           if (nbImports.length === 0) {
//             return imp;
//           }
//           const newImp = ts.factory.createImportDeclaration(
//             undefined,
//             ts.factory.createImportClause(
//               false,
//               undefined,
//               ts.factory.createNamedImports(
//                 nbImports.map(name =>
//                   ts.factory.createImportSpecifier(
//                     false,
//                     undefined,
//                     ts.factory.createIdentifier(name),
//                   ),
//                 ),
//               ),
//             ),
//             ts.factory.createStringLiteral(
//               'terraso-mobile-client/components/NativeBaseAdapters',
//             ),
//           );

//           if (remainingBindings.elements.length === 0) {
//             return newImp;
//           }

//           const updatedImp = ts.factory.updateImportDeclaration(
//             imp,
//             imp.modifiers,
//             ts.factory.updateImportClause(
//               imp.importClause,
//               imp.importClause.isTypeOnly,
//               imp.importClause.name,
//               remainingBindings,
//             ),
//             imp.moduleSpecifier,
//             imp.attributes,
//           );
//           return [updatedImp, newImp];
//         },
//         context,
//       ),
//   ]).transformed[0];

//   fs.writeFileSync(source.fileName, printer.printFile(transformed));
// });

// console.log(
//   imports.length,
//   imports.filter(imp => imp in layoutComponents).length,
//   imports.filter(imp => imp in textComponents).length,
// );

// // const transformFile = (file: string) => {
// //   const program = ts.createProgram([file], {});
// //   const checker = program.getTypeChecker();
// //   const source = program.getSourceFile(file)!;
// //   const printer = ts.createPrinter();

// //   const typeAliasToInterfaceTransformer: ts.TransformerFactory<
// //     ts.SourceFile
// //   > = context => {
// //     const visit: ts.Visitor = node => {
// //       node = ts.visitEachChild(node, visit, context);
// //       /*
// //       Convert type references to type literals
// //         interface IUser {
// //           username: string
// //         }
// //         type User = IUser <--- IUser is a type reference
// //         interface Context {
// //           user: User <--- User is a type reference
// //         }
// //       In both cases we want to convert the type reference to
// //       it's primitive literals. We want:
// //         interface IUser {
// //           username: string
// //         }
// //         type User = {
// //           username: string
// //         }
// //         interface Context {
// //           user: {
// //             username: string
// //           }
// //         }
// //     */
// //       if (ts.isTypeReferenceNode(node)) {
// //         const symbol = checker.getSymbolAtLocation(node.typeName);
// //         const type = checker.getDeclaredTypeOfSymbol(symbol);
// //         const declarations = _.flatMap(
// //           checker.getPropertiesOfType(type),
// //           property => {
// //             /*
// //           Type references declarations may themselves have type references, so we need
// //           to resolve those literals as well
// //         */
// //             return _.map(property.declarations, visit);
// //           },
// //         );
// //         return ts.createTypeLiteralNode(declarations.filter(ts.isTypeElement));
// //       }

// //       /*
// //       Convert type alias to interface declaration
// //         interface IUser {
// //           username: string
// //         }
// //         type User = IUser

// //       We want to remove all type aliases
// //         interface IUser {
// //           username: string
// //         }
// //         interface User {
// //           username: string  <-- Also need to resolve IUser
// //         }

// //     */

// //       if (ts.isTypeAliasDeclaration(node)) {
// //         const symbol = checker.getSymbolAtLocation(node.name);
// //         const type = checker.getDeclaredTypeOfSymbol(symbol);
// //         const declarations = _.flatMap(
// //           checker.getPropertiesOfType(type),
// //           property => {
// //             // Resolve type alias to it's literals
// //             return _.map(property.declarations, visit);
// //           },
// //         );

// //         // Create interface with fully resolved types
// //         return ts.createInterfaceDeclaration(
// //           [],
// //           [ts.createToken(ts.SyntaxKind.ExportKeyword)],
// //           node.name.getText(),
// //           [],
// //           [],
// //           declarations.filter(ts.isTypeElement),
// //         );
// //       }
// //       // Remove all export declarations
// //       if (ts.isImportDeclaration(node)) {
// //         return null;
// //       }

// //       return node;
// //     };

// //     return node => {
// //       const imports: ts.ImportDeclaration[] = [];
// //       const importVisitor: ts.Visitor = node => {
// //         node = ts.visitEachChild(node, visit, context);
// //         if (ts.isImportDeclaration(node)) {
// //           imports.push(node);
// //         }
// //         return node;
// //       };
// //       ts.visitNode(node, importVisitor);

// //       return ts.visitNode<ts.SourceFile, ts.Node, ts.SourceFile>(
// //         node,
// //         visit,
// //         ts.isSourceFile,
// //       )!;
// //     };
// //   };

// //   const result = ts.transform<ts.SourceFile>(source, [
// //     typeAliasToInterfaceTransformer,
// //   ]);
// //   return printer.printFile(result.transformed[0]);
// // };

// // // Create our output folder
// // const outputDir = path.resolve(__dirname, '../generated');
// // if (!fs.existsSync(outputDir)) {
// //   fs.mkdirSync(outputDir);
// // }

// // // Write pretty printed transformed typescript to output directory
// // fs.writeFileSync(path.resolve(__dirname, '../generated/models.ts'));
