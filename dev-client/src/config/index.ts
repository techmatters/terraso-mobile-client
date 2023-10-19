import Config from 'react-native-config';
import {MMKVLoader} from 'react-native-mmkv-storage';
import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';
import {Platform} from 'react-native';
import {PACKAGE_NAME} from 'terraso-mobile-client/constants';

const terrasoAPIURL =
  Config.TERRASO_BACKEND ?? 'https://api.staging.terraso.net';

const MMKV = new MMKVLoader().withEncryption().initialize();

const apiConfig = setAPIConfig({
  terrasoAPIURL: terrasoAPIURL,
  graphQLEndpoint: terrasoAPIURL + '/graphql',
  tokenStorage: {
    getToken: name => {
      const value = MMKV.getString(name);
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
  appleClientId: string;
  appleRedirectURI: string;
  microsoftClientId: string;
  microsoftRedirectURI: string;
  mapboxAccessToken: string;
};

var googleClientId = '';
var googleRedirectURI = '';
if (Platform.OS === 'ios') {
  googleClientId = Config.GOOGLE_OAUTH_IOS_CLIENT_ID ?? '';
  googleRedirectURI =
    `${Config.GOOGLE_OAUTH_IOS_URI_SCHEME}:/oauth2redirect` ?? '';
  appleRedirectURI =
    `${Config.APPLE_OAUTH_IOS_URI_SCHEME}:/oauth2redirect` ?? '';
  microsoftRedirectURI =
    `${Config.MICOROSFT_OAUTH_IOS_URI_SCHEME}:/oauth2redirect` ?? '';
} else if (Platform.OS === 'android') {
  googleClientId = Config.GOOGLE_OAUTH_ANDROID_CLIENT_ID ?? '';
  googleRedirectURI = `${PACKAGE_NAME}:/oauth2redirect`;
  appleRedirectURI = `${PACKAGE_NAME}:/oauth2redirect` ?? '';
  microsoftRedirectURI = `${PACKAGE_NAME}://oauth/redirect` ?? '';
}

appleClientId = Config.APPLE_OAUTH_MOBILE_CLIENT_ID ?? '';
microsoftClientId = Config.MICROSOFT_OAUTH_MOBILE_CLIENT_ID ?? '';

if (Config.PUBLIC_MAPBOX_TOKEN === undefined) {
  throw new Error('Config setting PUBLIC_MAPBOX_TOKEN not set');
}

export const APP_CONFIG: AppConfig = {
  packageName: PACKAGE_NAME,
  googleClientId: googleClientId,
  googleRedirectURI: googleRedirectURI,
  appleClientId: appleClientId,
  appleRedirectURI: appleRedirectURI,
  microsoftClientId: microsoftClientId,
  microsoftRedirectURI: microsoftRedirectURI,
  mapboxAccessToken: Config.PUBLIC_MAPBOX_TOKEN,
};

// to logout
// removeToken (MMKV)
// make backend call to invalidate session
