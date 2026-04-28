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
 * Scans source files for i18n key references and compares against a catalog.
 *
 * Exposed as a library (runScan / printScan) so the bundled `i18n-check`
 * orchestrator can call it directly. Also runnable as a CLI:
 *
 *   node scripts/i18n/find-keys.mjs [path1] [path2] ... \
 *     [--catalog path/to/catalog.json] [--json] [--extras]
 */

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
export const DYNAMIC_KEY_PREFIXES = [
  // e.g. 'soil.color.photo.',
];

// ---------- Regex extractors ----------
const RE_KEY = /i18nKey\s*=\s*(['"])([^'"]+?)\1/g;
const RE_LABEL = /labelI18nKey\s*=\s*(['"])([^'"]+?)\1/g;
const RE_URLKEY = /urlI18nKey\s*=\s*(['"])([^'"]+?)\1/g;
// Component-prop prefix: e.g. <TranslatedBulletList i18nKeyPrefix="welcome.next.bullet_" />.
// The component resolves keys like `${prefix}1`, `${prefix}2`, … at runtime,
// so register the captured string as a dynamic prefix.
const RE_KEY_PREFIX = /i18nKeyPrefix\s*=\s*(['"])([^'"]+?)\1/g;
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
// Bare key literal: any quoted string that *looks like* a dotted catalog key
// (letter-start, at least one dot). Post-filtered against catalogKeys so only
// real catalog keys get registered as referenced. Catches patterns the other
// regexes miss — ternaries (`t(cond ? 'a.b' : 'c.d')`), lookup tables, custom
// props like `label="slope.shape.info.concave"` where the component later
// calls `t(label)`. Intentionally permissive: false matches against non-keys
// are harmless because we intersect with catalogKeys.
const RE_KEY_LIKE_LITERAL = /['"]([a-zA-Z][\w.]*\.[\w_]+)['"]/g;
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

// ---------- Catalog leaf-key extraction ----------
// Collect LEAF keys with depth >= 2 (i.e. has at least one parent), joined
// with dots: {abc:{def:"x", xyz:"y"}, help:"hi"} → ["abc.def", "abc.xyz"].
function collectCatalogKeysFromObject(obj, parentPath = []) {
  const result = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const pathArr = [...parentPath, k];
      const isLeaf = !(v && typeof v === 'object');
      if (isLeaf && pathArr.length >= 2) result.push(pathArr.join('.'));
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        result.push(...collectCatalogKeysFromObject(v, pathArr));
      }
    }
  }
  return result;
}

function setDiff(a, b) {
  const out = [];
  for (const x of a) if (!b.has(x)) out.push(x);
  out.sort((x, y) => x.localeCompare(y));
  return out;
}

/**
 * Run the scan. Returns a structured result for inspection by callers
 * (the `i18n-check` orchestrator, etc.) without printing anything.
 *
 * @param {object} opts
 * @param {string[]} [opts.roots=['.']]    Source roots to walk.
 * @param {string|null} [opts.catalogPath] Path to en.json; null = scan only.
 * @returns {{
 *   scanKeys: string[],
 *   scanPrefixes: string[],
 *   occurrences: Map<string, Array<{file:string,line:number}>>,
 *   catalogKeys: Set<string>,
 *   catalogPath: string|null,
 *   inCatalogNotScan: string[],            // catalog has it, source doesn't reference it
 *   inCatalogCoveredByPrefix: string[],    // covered by a dynamic prefix; treat as used
 *   inScanNotCatalog: string[],            // source references it, catalog lacks it
 * }}
 */
export function runScan({roots = ['.'], catalogPath = null} = {}) {
  const scanKeys = new Set();
  const occurrences = new Map();
  const scanPrefixes = new Set();
  const keyLikeLiterals = new Set();

  function addOccurrence(key, file, line) {
    scanKeys.add(key);
    if (!occurrences.has(key)) occurrences.set(key, []);
    occurrences.get(key).push({file, line});
  }

  function collectFromRegex(re, text, file) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const key = m[2];
      if (key) addOccurrence(key, file, lineNumberFromIndex(text, m.index));
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }

  function collectFromI18nKeysBlock(text, file) {
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
        addOccurrence(key, file, lineNumberFromIndex(text, absoluteIdx));
        if (RE_STRING_IN_BLOCK.lastIndex === sm.index) {
          RE_STRING_IN_BLOCK.lastIndex++;
        }
      }
      if (RE_I18NKEYS_BLOCK.lastIndex === m.index) RE_I18NKEYS_BLOCK.lastIndex++;
    }
  }

  function collectTemplatePrefixes(text) {
    RE_TEMPLATE_PREFIX.lastIndex = 0;
    let m;
    while ((m = RE_TEMPLATE_PREFIX.exec(text))) {
      const prefix = m[1];
      if (prefix && IS_DYNAMIC_PREFIX.test(prefix)) scanPrefixes.add(prefix);
      if (RE_TEMPLATE_PREFIX.lastIndex === m.index) {
        RE_TEMPLATE_PREFIX.lastIndex++;
      }
    }
  }

  function collectKeyPrefixProps(text) {
    RE_KEY_PREFIX.lastIndex = 0;
    let m;
    while ((m = RE_KEY_PREFIX.exec(text))) {
      const prefix = m[2];
      if (prefix) scanPrefixes.add(prefix);
      if (RE_KEY_PREFIX.lastIndex === m.index) RE_KEY_PREFIX.lastIndex++;
    }
  }

  function collectKeyLikeLiterals(text) {
    RE_KEY_LIKE_LITERAL.lastIndex = 0;
    let m;
    while ((m = RE_KEY_LIKE_LITERAL.exec(text))) {
      keyLikeLiterals.add(m[1]);
      if (RE_KEY_LIKE_LITERAL.lastIndex === m.index) {
        RE_KEY_LIKE_LITERAL.lastIndex++;
      }
    }
  }

  function collectCatalogTRefs(value) {
    if (typeof value === 'string') {
      RE_CATALOG_T_REF.lastIndex = 0;
      let m;
      while ((m = RE_CATALOG_T_REF.exec(value))) {
        const key = m[1];
        if (m[2]) scanPrefixes.add(key + '_');
        else scanKeys.add(key);
        if (RE_CATALOG_T_REF.lastIndex === m.index) {
          RE_CATALOG_T_REF.lastIndex++;
        }
      }
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value)) collectCatalogTRefs(v);
    }
  }

  function processFile(filePath) {
    let text;
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }
    // Strip /* ... */ block comments so JSDoc example snippets don't surface
    // as fake references (e.g. ` * Example: t('some.key')` inside a docblock).
    // Line comments are left alone — `// t('foo')` is rare and usually a TODO
    // we'd want to surface anyway.
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');
    collectFromRegex(RE_KEY, text, filePath);
    collectFromRegex(RE_LABEL, text, filePath);
    collectFromRegex(RE_URLKEY, text, filePath);
    collectFromRegex(RE_T_FIRST_ARG, text, filePath);
    collectFromI18nKeysBlock(text, filePath);
    collectTemplatePrefixes(text);
    collectKeyPrefixProps(text);
    collectKeyLikeLiterals(text);
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

  let catalogKeys = new Set();
  if (catalogPath) {
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(raw);
    catalogKeys = new Set(
      collectCatalogKeysFromObject(parsed).sort((a, b) => a.localeCompare(b)),
    );
    collectCatalogTRefs(parsed);
    // Promote source-file bare-key literals to scanKeys iff they're real keys.
    for (const lit of keyLikeLiterals) {
      if (catalogKeys.has(lit)) scanKeys.add(lit);
    }
  }

  function isCoveredByDynamicPrefix(key) {
    for (const p of scanPrefixes) if (key.startsWith(p)) return true;
    for (const p of DYNAMIC_KEY_PREFIXES) if (key.startsWith(p)) return true;
    return false;
  }

  const inCatalogNotScanRaw = setDiff(catalogKeys, scanKeys);
  const inCatalogNotScan = inCatalogNotScanRaw.filter(
    k => !isCoveredByDynamicPrefix(k),
  );
  const inCatalogCoveredByPrefix = inCatalogNotScanRaw.filter(
    isCoveredByDynamicPrefix,
  );
  const inScanNotCatalog = setDiff(scanKeys, catalogKeys);

  return {
    scanKeys: Array.from(scanKeys).sort((a, b) => a.localeCompare(b)),
    scanPrefixes: Array.from(scanPrefixes).sort((a, b) => a.localeCompare(b)),
    occurrences,
    catalogKeys,
    catalogPath,
    inCatalogNotScan,
    inCatalogCoveredByPrefix,
    inScanNotCatalog,
  };
}

/**
 * Render a scan result to stdout in either JSON or human-readable form.
 */
export function printScan(result, opts = {}) {
  const {jsonOutput = false, showKeysInFileNotSource = false} = opts;
  const {
    scanKeys,
    scanPrefixes,
    occurrences,
    catalogKeys,
    catalogPath,
    inCatalogNotScan,
    inCatalogCoveredByPrefix,
    inScanNotCatalog,
  } = result;

  if (jsonOutput) {
    const out = {
      scan: {
        count: scanKeys.length,
        keys: scanKeys,
        occurrences: Object.fromEntries(
          scanKeys.map(k => [k, occurrences.get(k) ?? []]),
        ),
        dynamicPrefixes: {
          fromTemplates: scanPrefixes,
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
            inCatalogNotScan,
            inCatalogCoveredByPrefix,
            inScanNotCatalog,
          }
        : null,
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (catalogPath) console.log(`\n--- translation file ${catalogPath} ---\n`);

  console.log(`Found ${scanKeys.length} keys in source.`);
  console.log(
    `Found ${scanPrefixes.length} dynamic key prefixes` +
      (DYNAMIC_KEY_PREFIXES.length
        ? ` + ${DYNAMIC_KEY_PREFIXES.length} allowlisted.`
        : '.'),
  );

  if (catalogPath) {
    console.log(`Found ${catalogKeys.size} keys in ${catalogPath}`);
    console.log(
      `Found ${inCatalogNotScan.length} keys in ${catalogPath} not referenced (likely unused)`,
    );
    if (showKeysInFileNotSource) {
      inCatalogNotScan.forEach(k => console.log(`  '${k}'`));
    } else if (inCatalogNotScan.length) {
      console.log('  to see the list, pass --extras');
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
  } else {
    console.log('(Tip: pass --catalog path/to/en.json to compare with a catalog)');
  }
}

// ---------- CLI entry point ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  function popFlagWithValue(flag, arr) {
    const i = arr.indexOf(flag);
    if (i === -1) return null;
    const v = arr[i + 1];
    if (!v || v.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    arr.splice(i, 2);
    return v;
  }
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const showKeysInFileNotSource = args.includes('--extras');
  const catalogPath = popFlagWithValue('--catalog', args);
  const positional = args.filter(a => !a.startsWith('--'));
  const roots = positional.length ? positional : ['.'];

  let result;
  try {
    result = runScan({roots, catalogPath});
  } catch (e) {
    console.error(`Failed: ${e.message}`);
    process.exit(2);
  }
  printScan(result, {jsonOutput, showKeysInFileNotSource});
  process.exit(result.inScanNotCatalog.length === 0 ? 0 : 99);
}
