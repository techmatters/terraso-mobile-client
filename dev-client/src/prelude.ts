// Code in this file that needs to run before anything else
import {decode, encode} from 'base-64';

// jwt-decode (used in shared-client) no longer carries a polyfill for browser b64 functions which it uses
// react native JS built-ins does not include these functions, so we need to provide implementation
// see https://github.com/facebook/hermes/issues/1178 for updates
const b64_polyfill = () => {
  if (!global.btoa) {
    global.btoa = encode;
  }

  if (!global.atob) {
    global.atob = decode;
  }
};

b64_polyfill();
