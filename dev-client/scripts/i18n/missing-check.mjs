/*
 * Copyright © 2021-2025 Technology Matters
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

/*
 * Reports keys present in en.json but missing from other locale files.
 *
 * Exposed as a library (runMissingCheck) so the bundled `i18n-check`
 * orchestrator can call it directly. Also runnable as a CLI:
 *
 *   node scripts/i18n/missing-check.mjs
 */

import {readFile} from 'fs/promises';
import path from 'path';

import {filesInFolder} from './utils.mjs';
import {flatten} from 'flat';

const SOURCE_LOCALE = 'en';
const LOCALE_FILES_FOLDER = new URL('../../src/translations/', import.meta.url);

const getKeys = content => Object.keys(flatten(JSON.parse(content)));

/**
 * Returns per-locale lists of keys that exist in en.json but not in that
 * locale. Pure: returns data, doesn't print or exit.
 *
 * @param {object} [opts]
 * @param {URL} [opts.localesDir]
 * @returns {Promise<{results: Array<{language: string, missing: string[]}>}>}
 */
export async function runMissingCheck({localesDir = LOCALE_FILES_FOLDER} = {}) {
  const sourceContent = await readFile(
    new URL(`${SOURCE_LOCALE}.json`, localesDir),
  );
  const sourceKeys = new Set(getKeys(sourceContent));

  const files = await filesInFolder(localesDir);
  const localeFiles = files.filter(f => f.toString().endsWith('.json'));

  const results = [];
  for (const filePath of localeFiles) {
    const language = path.parse(filePath.pathname).name;
    if (language === SOURCE_LOCALE) continue;
    const localeContent = await readFile(filePath);
    const localeKeys = new Set(getKeys(localeContent));
    const missing = [];
    for (const k of sourceKeys) if (!localeKeys.has(k)) missing.push(k);
    missing.sort();
    results.push({language, missing});
  }
  return {results};
}

// ---------- CLI entry point ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  runMissingCheck()
    .then(({results}) => {
      let hasErrors = false;
      for (const {language, missing} of results) {
        if (missing.length === 0) continue;
        hasErrors = true;
        console.log(`Missing keys for ${language}.`, 'Missing:', missing);
      }
      if (hasErrors) {
        console.log(
          '\nTo add TK placeholders for all missing keys, run:\n  npm run i18n-fill-missing\n',
        );
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Error checking missing keys:', err);
      process.exit(2);
    });
}
