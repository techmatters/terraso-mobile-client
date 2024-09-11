const {getSentryExpoConfig} = require('@sentry/react-native/metro');

const defaultConfig = getSentryExpoConfig(__dirname);

const {assetExts, sourceExts} = defaultConfig.resolver;
/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  ...defaultConfig,
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },

  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
};

module.exports = getSentryExpoConfig(config, {
  annotateReactComponents: true,
});
