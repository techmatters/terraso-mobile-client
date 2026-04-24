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

/* Run this script to confirm consistency between translation files and the codebase. It will report discrepancies if there are missing or unused translations (if strings are used in code but not in the translation file, and vice versa).
 */

// Usage: node find-i18n-keys.mjs [path1] [path2] ... [--catalog path/to/catalog.json] [--json] [--extras]

// easiest way to run: 'npm run check-i18n'
// todo: run with other linters automatically; maybe add github action too.
import fs from 'node:fs';
import path from 'node:path';

const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
]);

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const showKeysInFileNotSource = args.includes('--extras');

function popFlagWithValue(flag, arr) {
  const i = arr.indexOf(flag);
  if (i === -1) return null;
  const v = arr[i + 1];
  if (!v || v.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  arr.splice(i, 2);
  return v;
}
const catalogPath = popFlagWithValue('--catalog', args);
const roots = args.length ? args : ['.'];

// ---------- FS walk ----------
function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.has(e.name)) yield* walk(path.join(dir, e.name));
    } else if (e.isFile() && exts.has(path.extname(e.name))) {
      yield path.join(dir, e.name);
    }
  }
}

// ---------- Dynamic key allowlist ----------
// When reporting "extra" keys (in the catalog but not referenced in code),
// any catalog key starting with one of these prefixes is treated as used.
// Needed for keys constructed via patterns the regex extractors below can't
// see — e.g. variable-based lookups, helper-function key builders, or keys
// pulled from a lookup table:
//
//   const KEYS = { DRY: 'soil.color.photo.DRY', WET: 'soil.color.photo.WET' };
//   t(KEYS[condition]);
//
// Template-literal prefixes (`soil.match_info.${x}`-style) are already caught
// automatically by RE_TEMPLATE_PREFIX below; you only need to add to this
// list when the automatic extraction misses something. Each prefix must end
// with a dot so it targets a complete catalog namespace boundary.
const DYNAMIC_KEY_PREFIXES = [
  // e.g. 'soil.color.photo.',
];

// ---------- Regex extractors ----------
const RE_KEY = /i18nKey\s*=\s*(['"])([^'"]+?)\1/g;
const RE_LABEL = /labelI18nKey\s*=\s*(['"])([^'"]+?)\1/g;
const RE_URLKEY = /urlI18nKey\s*=\s*(['"])([^'"]+?)\1/g;
const RE_T_FIRST_ARG = /\bt\s*\(\s*(['"])([^'"]+?)\1/g;
const RE_I18NKEYS_BLOCK = /i18nKeys\s*=\s*\{\s*\[\s*([\s\S]*?)\s*\]\s*\}/g;
const RE_STRING_IN_BLOCK = /(['"])([^'"]+?)\1/g;
// Template-literal prefix: captures the static part of any `prefix.${var}...`
// template literal up to the first ${. Used to discover dynamic key prefixes
// the codebase relies on (e.g. `soil.match_info.${soilType}` → "soil.match_info.").
const RE_TEMPLATE_PREFIX = /`([^`$]*?)\${/g;
// A captured prefix is usable only if it looks like a catalog-key namespace:
// starts with a letter, contains at least one dot (so "soil" alone is rejected
// as too broad), and can end in either a dot or word chars — the latter covers
// underscore-joined stems like `soil.texture.guide.prepare_details_${i}`.
const IS_DYNAMIC_PREFIX = /^[a-zA-Z][\w.]*\.[\w]*$/;
// Catalog-internal cross-reference: translation strings can invoke other
// catalog keys via i18next's `$t(key, ...)` interpolation. The optional second
// arg carries options; if it contains a `context` key, i18next resolves to
// `key_<contextValue>` at runtime (e.g. `..._ENGLISH` / `..._METRIC`), so we
// capture that signal too to register `key_` as a dynamic prefix.
const RE_CATALOG_T_REF = /\$t\(\s*([\w.]+)\s*(,\s*\{[^}]*"context"[^}]*\})?/g;

function lineNumberFromIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function collectFromRegex(re, text, file, pushFn) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    const key = m[2];
    if (key) pushFn(key, file, lineNumberFromIndex(text, m.index));
    if (re.lastIndex === m.index) re.lastIndex++;
  }
}

function collectFromI18nKeysBlock(text, file, pushFn) {
  RE_I18NKEYS_BLOCK.lastIndex = 0;
  let m;
  while ((m = RE_I18NKEYS_BLOCK.exec(text))) {
    const blockStart = m.index;
    const arrayContent = m[1] ?? '';
    RE_STRING_IN_BLOCK.lastIndex = 0;
    let sm;
    while ((sm = RE_STRING_IN_BLOCK.exec(arrayContent))) {
      const key = sm[2];
      const absoluteIdx = blockStart + sm.index;
      pushFn(key, file, lineNumberFromIndex(text, absoluteIdx));
      if (RE_STRING_IN_BLOCK.lastIndex === sm.index)
        RE_STRING_IN_BLOCK.lastIndex++;
    }
    if (RE_I18NKEYS_BLOCK.lastIndex === m.index) RE_I18NKEYS_BLOCK.lastIndex++;
  }
}

// ---------- Scan codebase ----------
const scanKeys = new Set();
const occurrences = new Map(); // key -> [{file,line}]
const scanPrefixes = new Set(); // dynamic-key prefixes found via template literals

function addOccurrence(key, file, line) {
  scanKeys.add(key);
  if (!occurrences.has(key)) occurrences.set(key, []);
  occurrences.get(key).push({file, line});
}

function collectTemplatePrefixes(text) {
  RE_TEMPLATE_PREFIX.lastIndex = 0;
  let m;
  while ((m = RE_TEMPLATE_PREFIX.exec(text))) {
    const prefix = m[1];
    if (prefix && IS_DYNAMIC_PREFIX.test(prefix)) {
      scanPrefixes.add(prefix);
    }
    if (RE_TEMPLATE_PREFIX.lastIndex === m.index) {
      RE_TEMPLATE_PREFIX.lastIndex++;
    }
  }
}

function processFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  collectFromRegex(RE_KEY, text, filePath, addOccurrence);
  collectFromRegex(RE_LABEL, text, filePath, addOccurrence);
  collectFromRegex(RE_URLKEY, text, filePath, addOccurrence);
  collectFromRegex(RE_T_FIRST_ARG, text, filePath, addOccurrence);
  collectFromI18nKeysBlock(text, filePath, addOccurrence);
  collectTemplatePrefixes(text);
}

for (const root of roots) {
  try {
    const st = fs.statSync(root);
    if (st.isDirectory()) for (const f of walk(root)) processFile(f);
    else if (st.isFile()) processFile(root);
  } catch {
    /* ignore */
  }
}

scanKeys.delete('projects.sites.sort.'); // special case; not really a key

// Walk parsed catalog JSON string values and harvest `$t(key, ...)` refs.
// Plain `$t(key)` → add key to scanKeys (it's a direct ref).
// `$t(key, {context: ...})` → add `key_` to scanPrefixes only; the bare key
// is typically never present in the catalog (only the `_<ctx>` variants are),
// so treating it as "referenced" would surface false missing-key warnings.
function collectCatalogTRefs(value) {
  if (typeof value === 'string') {
    RE_CATALOG_T_REF.lastIndex = 0;
    let m;
    while ((m = RE_CATALOG_T_REF.exec(value))) {
      const key = m[1];
      if (m[2]) scanPrefixes.add(key + '_');
      else scanKeys.add(key);
      if (RE_CATALOG_T_REF.lastIndex === m.index) RE_CATALOG_T_REF.lastIndex++;
    }
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectCatalogTRefs(v);
  }
}

// ---------- Catalog JSON extraction ----------
// Rule: collect LEAF keys that have at least one parent (depth >= 2), joined with dots.
// e.g. {abc:{def:"x", xyz:"y"}, help:"hi"} -> abc.def, abc.xyz   (skip "help")
function collectCatalogKeysFromObject(obj, parentPath = []) {
  const result = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const pathArr = [...parentPath, k];
      const depth = pathArr.length;
      const isLeaf = !(v && typeof v === 'object');
      if (isLeaf && depth >= 2) {
        const joined = pathArr.join('.');
        result.push(joined);
      }
      // Recurse into objects for deeper leaves
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        result.push(...collectCatalogKeysFromObject(v, pathArr));
      }
    }
  }
  return result;
}

let catalogKeys = new Set();
if (catalogPath) {
  try {
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(raw);
    catalogKeys = new Set(
      collectCatalogKeysFromObject(parsed).sort((a, b) => a.localeCompare(b)),
    );
    collectCatalogTRefs(parsed);
    console.log(`\n--- translation file ${catalogPath} ---\n`);
  } catch (e) {
    console.error(
      `Failed to read/parse catalog JSON at ${catalogPath}: ${e.message}`,
    );
    process.exit(2);
  }
}

// ---------- Diff ----------
function setDiff(a, b) {
  const out = [];
  for (const x of a) if (!b.has(x)) out.push(x);
  out.sort((x, y) => x.localeCompare(y));
  return out;
}

// A catalog key is covered by a dynamic prefix if any of the prefixes auto-
// discovered from template literals OR explicitly allowlisted in
// DYNAMIC_KEY_PREFIXES is a prefix of the key.
function isCoveredByDynamicPrefix(key) {
  for (const p of scanPrefixes) if (key.startsWith(p)) return true;
  for (const p of DYNAMIC_KEY_PREFIXES) if (key.startsWith(p)) return true;
  return false;
}

// Raw diff (pre-filter) — useful to distinguish "truly orphaned" from
// "covered by a dynamic prefix" in output/JSON.
const inCatalogNotScanRaw = setDiff(catalogKeys, scanKeys);
const inCatalogNotScan = inCatalogNotScanRaw.filter(
  k => !isCoveredByDynamicPrefix(k),
);
const inCatalogCoveredByPrefix = inCatalogNotScanRaw.filter(
  isCoveredByDynamicPrefix,
);
const inScanNotCatalog = setDiff(scanKeys, catalogKeys);

// ---------- Output ----------
// Sorted after catalog parsing so $t()-discovered refs are included.
const sortedScanKeys = Array.from(scanKeys).sort((a, b) => a.localeCompare(b));
const sortedScanPrefixes = Array.from(scanPrefixes).sort((a, b) =>
  a.localeCompare(b),
);

if (jsonOutput) {
  const out = {
    scan: {
      count: sortedScanKeys.length,
      keys: sortedScanKeys,
      occurrences: Object.fromEntries(
        sortedScanKeys.map(k => [k, occurrences.get(k) ?? []]),
      ),
      dynamicPrefixes: {
        fromTemplates: sortedScanPrefixes,
        allowlisted: [...DYNAMIC_KEY_PREFIXES],
      },
    },
    catalog: catalogPath
      ? {
          path: catalogPath,
          count: catalogKeys.size,
          keys: Array.from(catalogKeys).sort(),
        }
      : null,
    diff: catalogPath
      ? {
          inCatalogNotScan: inCatalogNotScan,
          inCatalogCoveredByPrefix: inCatalogCoveredByPrefix,
          inScanNotCatalog: inScanNotCatalog,
        }
      : null,
  };
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`Found ${sortedScanKeys.length} keys in source.`);
  console.log(
    `Found ${sortedScanPrefixes.length} dynamic key prefixes (template literals)` +
      (DYNAMIC_KEY_PREFIXES.length
        ? ` + ${DYNAMIC_KEY_PREFIXES.length} allowlisted.`
        : '.'),
  );
  if (catalogPath) {
    console.log(`Found ${catalogKeys.size} keys in ${catalogPath}`);

    console.log(
      `Found ${inCatalogNotScan.length} keys in ${catalogPath} not referenced (likely unused)`,
    );
    console.log('  to see the list: npm run check-i18n -- --extras ');
    if (showKeysInFileNotSource) {
      inCatalogNotScan.forEach(k => console.log(`  '${k}'`));
    }

    if (inCatalogCoveredByPrefix.length) {
      console.log(
        `(${inCatalogCoveredByPrefix.length} additional keys covered by dynamic prefixes — treated as used.)`,
      );
    }

    console.log(
      `Found ${inScanNotCatalog.length} keys in source not in ${catalogPath}`,
    );
    inScanNotCatalog.forEach(k => console.log(`  '${k}'`));

    //
  } else {
    console.log(
      '(Tip: pass --catalog path/to/en.json to compare with a catalog)',
    );
  }

  process.exit(inScanNotCatalog.length == 0 ? 0 : 99);

  // Also print occurrences at the end for convenience
  // console.log("\nOccurrences:");
  // for (const k of sortedScanKeys) {
  //   const occ = occurrences.get(k) ?? [];
  //   for (const { file, line } of occ) console.log(`${k}\t${file}:${line}`);
  // }
}
