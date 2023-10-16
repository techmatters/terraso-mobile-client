module.exports = api => {
  api.cache(true);

  return {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'babel-plugin-root-import',
        {
          rootPathPrefix: 'terraso-mobile-client/',
          rootPathSuffix: './src',
        },
      ],
    ],
  };
};
