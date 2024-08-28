const {mergeConfig} = require('@react-native/metro-config');
const {getSentryExpoConfig} = require('@sentry/react-native/metro');

const {
  createSentryMetroSerializer,
} = require('@sentry/react-native/dist/js/tools/sentryMetroSerializer');

const defaultConfig = getSentryExpoConfig(__dirname);

const {assetExts, sourceExts} = defaultConfig.resolver;
/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },

  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },

  serializer: {
    customSerializer: createSentryMetroSerializer(),
  },
};

const m = mergeConfig(defaultConfig, config);
module.exports = getSentryExpoConfig(m, {
  annotateReactComponents: true,
});
