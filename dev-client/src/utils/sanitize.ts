/*
 * Copyright © 2025 Technology Matters
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
 * Core sanitization for names used in filenames or URL paths.
 *
 * Handles:
 * - Unicode normalization (NFC)
 * - Control characters removed
 * - Filesystem-invalid chars (/\:*?"<>|) → hyphens
 * - URL-problematic chars (#&=%()') removed
 * - Multiple hyphens collapsed
 * - Leading/trailing dots and hyphens trimmed
 */
const sanitizeNameCore = (name: string): string => {
  return (
    name
      .normalize('NFC')
      .trim()
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, '') // control chars
      .replace(/[/\\:*?"<>|]/g, '-') // filesystem-invalid → hyphen
      .replace(/[#&=%()'']/g, '') // URL-problematic chars
      .replace(/-+/g, '-') // collapse hyphens
      .replace(/^[.-]+|[.-]+$/g, '')
  ); // trim dots and hyphens
};

/**
 * Sanitizes a string for use as a local filename.
 * Preserves spaces for readability.
 *
 * @example
 * sanitizeFilename("Project: Phase 1")     // "Project- Phase 1"
 * sanitizeFilename("Tested 12/29/2025")    // "Tested 12-29-2025"
 * sanitizeFilename("What's Next?")         // "Whats Next"
 * sanitizeFilename("Файл (test)")          // "Файл test"
 */
export const sanitizeFilename = (name: string): string => {
  const MAX_LENGTH = 100; // Conservative limit; reserves space for extension
  return sanitizeNameCore(name.substring(0, MAX_LENGTH)) || 'file';
};

/**
 * Sanitizes a string for use in a URL path segment.
 * Converts spaces to hyphens for cleaner URLs.
 *
 * @example
 * sanitizeNameForUrl("Project: Phase 1")   // "Project-Phase-1"
 * sanitizeNameForUrl("Tested 12/29/2025")  // "Tested-12-29-2025"
 * sanitizeNameForUrl("Київ Site")          // "Київ-Site"
 * sanitizeNameForUrl("What's Next?")       // "Whats-Next"
 */
export const sanitizeNameForUrl = (name: string): string => {
  // Convert spaces to hyphens before core sanitization
  const withHyphens = name.replace(/\s+/g, '-');
  return sanitizeNameCore(withHyphens) || 'export';
};
