module.exports = api => {
  api.cache(true);

  return {
    presets: [
      'module:@react-native/babel-preset',
      ['@babel/preset-env', {targets: {node: 'current'}}],
      '@babel/preset-typescript',
    ],
    plugins: [
      [
        'babel-plugin-root-import',
        {
          rootPathPrefix: 'terraso-mobile-client/',
          rootPathSuffix: './src',
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
