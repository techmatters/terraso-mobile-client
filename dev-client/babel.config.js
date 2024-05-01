module.exports = api => {
  api.cache(true);

  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins: [
      [
        'babel-plugin-root-import',
        {
          rootPathPrefix: 'terraso-mobile-client/',
          rootPathSuffix: './src',
        },
      ],
      'react-native-reanimated/plugin',
      'react-native-paper/babel',
    ],
  };
};
