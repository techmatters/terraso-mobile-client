import Config from 'react-native-config';
import {MMKVLoader} from 'react-native-mmkv-storage';
import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';
import {Platform} from 'react-native';

const terrasoAPIURL =
  Config.TERRASO_BACKEND ?? 'https://api.staging.terraso.net';

const MMKV = new MMKVLoader().withEncryption().initialize();

const apiConfig = setAPIConfig({
  terrasoAPIURL: terrasoAPIURL,
  graphQLEndpoint: terrasoAPIURL + '/graphql',
  tokenStorage: {
    getToken: async name => {
      const value = await MMKV.getStringAsync(name);
      return value === null ? undefined : value;
    },
    setToken: (name, value) => MMKV.setStringAsync(name, value),
    removeToken: name => {
      MMKV.removeItem(name);
    },
    initialToken: null,
  },
  // TODO: pick out logger
  logger: (_severity, args) => console.log(args),
} as TerrasoAPIConfig);

export const getConfig = apiConfig;

// NOTE: This will be changed to be more general at some point, for now it's just grabbing
// values from the config setup
type AppConfig = {
  packageName: string;
  googleClientId: string;
  googleRedirectURI: string;
};

export const APP_CONFIG: AppConfig = {
  packageName: 'org.terraso.landpks',
  googleClientId:
    Platform.OS === 'android'
      ? Config.GOOGLE_OAUTH_ANDROID_CLIENT_ID ?? ''
      : Config.GOOGLE_OAUTH_IOS_CLIENT_ID ?? '',
  googleRedirectURI:
    Platform.OS === 'android'
      ? `${Config.GOOGLE_OAUTH_ANDROID_CLIENT_ID}:/oauth2redirect` ?? ''
      : `${Config.GOOGLE_OAUTH_IOS_URI_SCHEME}:/oauth2redirect` ?? '',
};
