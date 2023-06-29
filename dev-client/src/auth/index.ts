import Config from 'react-native-config';
import {OAuthProvider} from '../types';

function checkFields(fields: string[], json: object) {
  return fields.filter(key => !Object.hasOwn(json, key)).length > 0;
}

export async function exchangeToken(
  identityJwt: string,
  provider: OAuthProvider,
) {
  const resp = await fetch(Config.TERRASO_BACKEND + '/auth/token-exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      provider,
      jwt: identityJwt,
    }),
  });
  if (!resp.ok) {
    // TODO: handle error
    throw 'Error with token exchange';
  }
  const payload = await resp.json();

  if (
    checkFields(['atoken', 'rtoken', 'user'], payload) ||
    checkFields(['email', 'firstName'], payload.user)
  ) {
    // TODO: handle error
    console.error(payload);
    throw 'Bad token JSON';
  }

  // TODO: Just doing this to get the right types, has to be a better way
  return {
    atoken: String(payload.atoken),
    rtoken: String(payload.rtoken),
    email: String(payload.user.email),
    firstName: String(payload.user.firstName),
    lastName: String(payload.user.lastName),
  };
}
