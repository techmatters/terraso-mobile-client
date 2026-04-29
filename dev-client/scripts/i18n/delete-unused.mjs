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
 * Catalog cleanup. Two passes per locale file in src/translations/:
 *
 *   1. Delete keys the scanner flags as unused (catalog has them, source
 *      doesn't reference them).
 *   2. Prune empty `"foo": {}` sections — both ones left over from the
 *      delete pass, and pre-existing dead structure.
 *
 * Both passes always run; pass 2 is useful even when there are no unused
 * keys to delete. Operates on every locale so all stay in sync.
 *
 * USE WITH CARE. The scanner has heuristics; if it doesn't yet recognize a
 * pattern your code uses (e.g. a custom-prop component or unusual lookup),
 * a key it calls "unused" may actually be live. Always eyeball the dry-run
 * output before passing --yes.
 *
 * Usage:
 *   npm run i18n-delete-unused          # dry-run, shows what would change
 *   npm run i18n-delete-unused -- --yes # actually apply
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

// Recursive in-place delete by dotted-path. Returns true iff the leaf existed
// and was removed.
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

// Recursively prune empty plain-object children. Returns the dotted paths
// that were removed (post-recursion order: deepest first).
function pruneEmpty(obj, parentPath = []) {
  const removed = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return removed;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      removed.push(...pruneEmpty(v, [...parentPath, k]));
      if (Object.keys(v).length === 0) {
        delete obj[k];
        removed.push([...parentPath, k].join('.'));
      }
    }
  }
  return removed;
}

// ---------- compute changes per locale ----------
const scan = runScan({roots: [SOURCE_ROOT], catalogPath: CATALOG_PATH});
const unused = scan.inCatalogNotScan;

const localeFiles = readdirSync(TRANSLATIONS_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => path.join(TRANSLATIONS_DIR, f));

const fileChanges = []; // {file, removed, prunedPaths, data, trailing}
for (const f of localeFiles) {
  const raw = readFileSync(f, 'utf8');
  const trailing = raw.endsWith('\n') ? '\n' : '';
  const data = JSON.parse(raw);

  let removed = 0;
  for (const k of unused) {
    if (deleteAtPath(data, k.split('.'))) removed++;
  }
  const prunedPaths = pruneEmpty(data);

  fileChanges.push({file: f, removed, prunedPaths, data, trailing});
}

const totalRemoved = fileChanges.reduce((s, c) => s + c.removed, 0);
const totalPruned = fileChanges.reduce((s, c) => s + c.prunedPaths.length, 0);

if (totalRemoved === 0 && totalPruned === 0) {
  console.log('Nothing to do — no unused keys, no empty sections.');
  process.exit(0);
}

// ---------- preview ----------
if (unused.length > 0) {
  console.log(`Found ${unused.length} unused key(s):`);
  for (const k of unused) console.log(`  ${k}`);
}

if (totalPruned > 0) {
  console.log(
    `\n${unused.length > 0 ? 'After deletion, would prune' : 'Would prune'} ${totalPruned} empty section(s):`,
  );
  for (const c of fileChanges) {
    if (c.prunedPaths.length === 0) continue;
    console.log(`  ${path.basename(c.file)}:`);
    for (const p of c.prunedPaths) console.log(`    ${p}`);
  }
}

if (!APPLY) {
  console.log(`\nDry run. Re-run with --yes to apply.`);
  process.exit(0);
}

// ---------- apply ----------
for (const c of fileChanges) {
  if (c.removed === 0 && c.prunedPaths.length === 0) continue;
  writeFileSync(c.file, JSON.stringify(c.data, null, 4) + c.trailing);
  const rel = path.relative(process.cwd(), c.file);
  console.log(
    `${rel}: removed ${c.removed} key(s), pruned ${c.prunedPaths.length} empty section(s)`,
  );
}

console.log(
  `\nDone. ${totalRemoved} key removal(s), ${totalPruned} empty section(s) pruned across ${localeFiles.length} file(s).`,
);
