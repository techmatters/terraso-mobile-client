/*
 * Copyright © 2026 Technology Matters
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

import CryptoJS from 'crypto-js';

import {isInternalAccount} from 'terraso-mobile-client/model/sync/internalAccounts';

describe('isInternalAccount', () => {
  test('matches our domains, case-insensitive and trimmed', () => {
    expect(isInternalAccount('someone@terraso.org')).toBe(true);
    expect(isInternalAccount('someone@techmatters.org')).toBe(true);
    expect(isInternalAccount('Someone@Techmatters.ORG')).toBe(true);
    expect(isInternalAccount('  person@terraso.org  ')).toBe(true);
  });

  test('matches a hashed individual address (verified via its own hash)', () => {
    // The real internal addresses are intentionally NOT written in plaintext in
    // this public repo. Instead, verify the hash-match path end-to-end with a
    // throwaway address and its own SHA-256 inserted into the set under test.
    const email = 'nobody-test@example.test';
    const hash = CryptoJS.SHA256(email).toString(CryptoJS.enc.Hex);
    expect(isInternalAccount(email, new Set([hash]))).toBe(true);
    expect(isInternalAccount('other@example.test', new Set([hash]))).toBe(
      false,
    );
  });

  test('does not match customer / unknown accounts', () => {
    expect(isInternalAccount('customer@example.com')).toBe(false);
    expect(isInternalAccount('someone@gmail.com')).toBe(false);
    // Lookalike domains must not match the exact-domain list.
    expect(isInternalAccount('x@notterraso.org')).toBe(false);
    expect(isInternalAccount('x@terraso.org.evil.com')).toBe(false);
  });

  test('handles missing / empty email', () => {
    expect(isInternalAccount(undefined)).toBe(false);
    expect(isInternalAccount(null)).toBe(false);
    expect(isInternalAccount('')).toBe(false);
  });
});
