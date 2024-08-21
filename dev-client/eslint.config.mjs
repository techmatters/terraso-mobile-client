import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {includeIgnoreFile} from '@eslint/compat';
import {FlatCompat} from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends('@react-native'),
  includeIgnoreFile(gitignorePath),
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js'],

    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-curly-brace-presence': 'error',

      'react/no-unstable-nested-components': [
        'error',
        {
          allowAsProps: true,
        },
      ],

      'no-restricted-imports': 'off',

      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'native-base',

              importNames: [
                'Box',
                'Column',
                'Row',
                'Row',
                'Column',
                'View',
                'Badge',
                'Text',
                'Heading',
              ],
            },
          ],

          patterns: ['./*', '../*'],
        },
      ],
    },
  },
];
