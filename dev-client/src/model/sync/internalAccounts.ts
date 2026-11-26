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

/*
 * Internal/staff accounts are excluded from the one-time re-anchor to prod (see
 * docs/v396staging-prod-recovery-plan.md) so that staging-only test data they
 * created on the bad build is never pushed to prod.
 *
 * Our domains are public, so they're listed in the clear. Individual tester
 * addresses are stored as SHA-256 hashes of their lowercased form to keep them
 * out of this public repo in plaintext — obfuscation against casual scraping,
 * not real secrecy. This matches the server migration's exclusion list.
 */
const EXCLUDED_DOMAINS = ['terraso.org', 'techmatters.org'];

const EXCLUDED_EMAIL_HASHES = new Set([
  // d...
  'dee694743aa32184623eace4e0cb75f11d3e646c104e48442af6fe2e5b958403',
]);

const sha256Hex = (value: string): string =>
  CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex);

/**
 * True for internal/staff accounts that must be excluded from the re-anchor:
 * either the email's domain is one of ours, or the (lowercased) email matches
 * one of the hashed individual addresses. Emails are trimmed and lowercased
 * before matching.
 */
export const isInternalAccount = (
  email?: string | null,
  excludedEmailHashes: ReadonlySet<string> = EXCLUDED_EMAIL_HASHES,
): boolean => {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split('@')[1];
  if (domain !== undefined && EXCLUDED_DOMAINS.includes(domain)) {
    return true;
  }
  return excludedEmailHashes.has(sha256Hex(normalized));
};
