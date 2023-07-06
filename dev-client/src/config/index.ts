import Config from 'react-native-config';
import EncryptedStorage from 'react-native-encrypted-storage';
import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';

const terrasoAPIURL =
  Config.TERRASO_BACKEND ?? 'https://api.staging.terraso.net';

const config = setAPIConfig({
  terrasoAPIURL: terrasoAPIURL,
  graphQLEndpoint: terrasoAPIURL + '/graphql',
  tokenStorage: {
    getToken: name =>
      EncryptedStorage.getItem(name).then(name => name ?? undefined),
    setToken: (name, token) => EncryptedStorage.setItem(name, token),
    removeToken: name => EncryptedStorage.removeItem(name),
    initialToken: null,
  },
  // TODO: pick out logger
  logger: (_severity, args) => console.log(args),
} as TerrasoAPIConfig);

export const getConfig = config;
