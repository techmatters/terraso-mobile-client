module.exports = {
  root: true,
  extends: '@react-native',
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
};
