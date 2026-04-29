#!/usr/bin/env node

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

/*
 * Delete keys that the scanner reports as unused (catalog has them, source
 * doesn't reference them). Removes from every locale file in src/translations/
 * so all stay in sync. Use after a manual review of the warning list from
 * `npm run i18n-check`.
 *
 * USE WITH CARE. The scanner has heuristics; if it doesn't yet recognize a
 * pattern your code uses (e.g. a custom-prop component or unusual lookup),
 * a key it calls "unused" may actually be live. Always eyeball the dry-run
 * output before passing --yes.
 *
 * Usage:
 *   npm run i18n-delete-unused          # dry-run, prints the list
 *   npm run i18n-delete-unused -- --yes # actually delete
 */

import {readdirSync, readFileSync, writeFileSync} from 'fs';
import path from 'path';

import {runScan} from './find-keys.mjs';

const TRANSLATIONS_DIR = path.resolve(
  import.meta.dirname,
  '../../src/translations',
);
const CATALOG_PATH = path.join(TRANSLATIONS_DIR, 'en.json');
const SOURCE_ROOT = '.';

const APPLY = process.argv.slice(2).includes('--yes');

const scan = runScan({roots: [SOURCE_ROOT], catalogPath: CATALOG_PATH});
const unused = scan.inCatalogNotScan;

if (unused.length === 0) {
  console.log('No unused keys found.');
  process.exit(0);
}

console.log(`Found ${unused.length} unused key(s):`);
for (const k of unused) console.log(`  ${k}`);

if (!APPLY) {
  console.log(
    `\nDry run. Re-run with --yes to delete these keys from every locale file.`,
  );
  process.exit(0);
}

// Recursive in-place delete by dotted-path. Returns true iff the leaf existed
// and was removed; doesn't prune now-empty parent objects (cheap to leave).
function deleteAtPath(obj, parts) {
  if (parts.length === 0) return false;
  const [head, ...rest] = parts;
  if (!(head in obj)) return false;
  if (rest.length === 0) {
    delete obj[head];
    return true;
  }
  if (obj[head] && typeof obj[head] === 'object') {
    return deleteAtPath(obj[head], rest);
  }
  return false;
}

const localeFiles = readdirSync(TRANSLATIONS_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => path.join(TRANSLATIONS_DIR, f));

let totalRemoved = 0;
for (const f of localeFiles) {
  const raw = readFileSync(f, 'utf8');
  const trailing = raw.endsWith('\n') ? '\n' : '';
  const parsed = JSON.parse(raw);
  let hit = 0;
  for (const k of unused) {
    if (deleteAtPath(parsed, k.split('.'))) hit++;
  }
  const out = JSON.stringify(parsed, null, 4) + trailing;
  writeFileSync(f, out);
  console.log(`${path.relative(process.cwd(), f)}: removed ${hit} key(s)`);
  totalRemoved += hit;
}

console.log(
  `\nDone. ${totalRemoved} key removal(s) across ${localeFiles.length} file(s).`,
);
