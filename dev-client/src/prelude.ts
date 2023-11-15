/*
 * Copyright © 2023 Technology Matters
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
