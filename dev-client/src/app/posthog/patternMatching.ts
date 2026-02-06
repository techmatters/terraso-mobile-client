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

/**
 * Matches email against a glob pattern.
 * Supports wildcards: * (any characters), ? (single character)
 *
 * Examples:
 *   - "*@techmatters.org" matches any email at techmatters.org
 *   - "user?@example.com" matches user1@, usera@, etc.
 *   - "specific@example.com" matches exactly that email
 */
export function emailMatchesPattern(email: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // * matches any characters, ? matches single character
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except * and ?
    .replace(/\*/g, '.*') // Convert * to .*
    .replace(/\?/g, '.'); // Convert ? to .

  const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case insensitive
  return regex.test(email);
}

/**
 * Check if a build number matches a single pattern.
 * Patterns can be:
 *   - Exact: "999" matches build 999
 *   - Range: "100-200" matches builds 100-200 inclusive
 *   - Min only: "300-" matches builds >= 300
 *   - Max only: "-500" matches builds <= 500
 */
export function buildMatchesPattern(
  buildNumber: number,
  pattern: string,
): boolean {
  const trimmed = String(pattern).trim();

  let min = 0;
  let max = Number.MAX_SAFE_INTEGER;

  const rangeMatch = trimmed.match(/^(\d*)-(\d*)$/);
  if (rangeMatch) {
    const [, minStr, maxStr] = rangeMatch;
    if (!minStr && !maxStr) return false; // Reject bare "-"
    if (minStr) min = parseInt(minStr, 10);
    if (maxStr) max = parseInt(maxStr, 10);
  } else {
    const exact = parseInt(trimmed, 10);
    if (isNaN(exact)) return false;
    min = max = exact;
  }

  return buildNumber >= min && buildNumber <= max;
}
