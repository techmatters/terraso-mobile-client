import Config from 'react-native-config';
import EncryptedStorage from 'react-native-encrypted-storage';
import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';

const terrasoAPIURL =
  Config.TERRASO_BACKEND ?? 'https://api.staging.terraso.net';

const apiConfig = setAPIConfig({
  terrasoAPIURL: terrasoAPIURL,
  graphQLEndpoint: terrasoAPIURL + '/graphql',
  tokenStorage: {
    getToken: name =>
      EncryptedStorage.getItem(name).then(token => token ?? undefined),
    setToken: (name, token) => EncryptedStorage.setItem(name, token),
    removeToken: name => EncryptedStorage.removeItem(name),
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
};

export const APP_CONFIG: AppConfig = {
  packageName: 'org.terraso.landpks',
  googleClientId:
    (Config.GOOGLE_OAUTH_APP_GUID ?? '') + '.apps.googleusercontent.com',
};
