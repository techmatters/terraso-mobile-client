/*
 * Copyright © 2024 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';

const terrasoBackend = 'http://192.168.6.1:8000';
setAPIConfig({
  terrasoAPIURL: terrasoBackend,
  graphQLEndpoint: terrasoBackend + '/graphql/',
  tokenStorage: {
    getToken: () => {
      // pre-generated jwt token for the object {email: test@domain.extension}
      return 'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRlc3RAZG9tYWluLmV4dGVuc2lvbiJ9.WWiwMMkz38PaaT3of4oj8VVUYY2RLoRJQ9WkTlzq57Y';
    },
    setToken: () => {},
    removeToken: () => {},
    initialToken: null,
  },
  // TODO: pick out logger
  logger: (_severity, args) => console.log(args),
} as TerrasoAPIConfig);

export const APP_CONFIG = {
  //   appleClientId: ENV_CONFIG.APPLE_OAUTH_CLIENT_ID,
  //   appleRedirectURI: ENV_CONFIG.APPLE_OAUTH_REDIRECT_URI,
  //   microsoftClientId: ENV_CONFIG.MICROSOFT_OAUTH_CLIENT_ID,
  mapboxAccessToken:
    'pk.eyJ1IjoidGVycmFzbyIsImEiOiJjbGZtbjJuaHkwZGV2M3BxZGV4bzh1eW9tIn0.hF3oI29U0DDLoaDJ0sB0Uw',
  sentryEnabled: false,
  environment: 'test',
} as const;
