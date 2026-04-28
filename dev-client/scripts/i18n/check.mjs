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
 * The bundled i18n gate. Runs four checks in turn and aggregates results
 * into ERRORS (block CI / pre-commit / poeditor-merge) and WARNINGS (printed
 * but non-blocking).
 *
 *   1. find-keys     — code references a key that doesn't exist in en.json    [ERROR]
 *                    — en.json has a key that no source file references       [WARNING]
 *   2. find-variables — non-en locale has different {{vars}} than en.json     [ERROR]
 *   3. missing-check  — non-en locale is missing a key present in en.json     [ERROR]
 *   4. tk-placeholders — locale value still starts with "TK " (untranslated)  [WARNING]
 *
 * Usage:
 *   npm run i18n-check          # human-readable summary, exit 1 on any error
 *   npm run i18n-check -- --quiet   # only print on errors/warnings
 */

import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {flatten} from 'flat';

import {runScan} from './find-keys.mjs';
import {runValidate} from './find-variables.mjs';
import {runMissingCheck} from './missing-check.mjs';

const TRANSLATIONS_DIR = 'src/translations';
const CATALOG_PATH = path.join(TRANSLATIONS_DIR, 'en.json');
const SOURCE_ROOT = '.';

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');

const errors = [];
const warnings = [];

function header(label) {
  if (!QUIET) console.log(`\n=== ${label} ===`);
}

// ---------- 1. find-keys ----------
header('source ↔ catalog (find-keys)');
const scan = runScan({roots: [SOURCE_ROOT], catalogPath: CATALOG_PATH});

if (scan.inScanNotCatalog.length > 0) {
  errors.push({
    title: `${scan.inScanNotCatalog.length} key(s) referenced in source but missing from ${CATALOG_PATH}`,
    items: scan.inScanNotCatalog.map(k => {
      const occ = scan.occurrences.get(k) ?? [];
      const where = occ[0] ? ` (e.g. ${occ[0].file}:${occ[0].line})` : '';
      return `'${k}'${where}`;
    }),
    fix: [
      'Add the key to en.json, then backfill TK placeholders in other locales with:',
      '  npm run i18n-fill-missing',
      'Or fix the source-side typo.',
    ].join('\n'),
  });
}

if (scan.inCatalogNotScan.length > 0) {
  warnings.push({
    title: `${scan.inCatalogNotScan.length} key(s) in ${CATALOG_PATH} not referenced by any source file`,
    items: scan.inCatalogNotScan.map(k => `'${k}'`),
    fix: [
      'Eyeball the list, then run:',
      '  npm run i18n-delete-unused           # dry-run',
      '  npm run i18n-delete-unused -- --yes  # actually delete',
      'The next `npm run poeditor-merge` will propagate the deletions to POEditor.',
    ].join('\n'),
  });
}

if (!QUIET) {
  console.log(
    `  scanned ${scan.scanKeys.length} keys in source / ${scan.catalogKeys.size} in catalog ` +
      `· ${scan.scanPrefixes.length} dynamic prefixes`,
  );
}

// ---------- 2. find-variables ----------
header('locale variable consistency (find-variables)');
const variableResult = await runValidate();
const varMismatches = variableResult.results.flatMap(({language, mismatches}) =>
  mismatches.map(m => ({language, ...m})),
);
if (varMismatches.length > 0) {
  errors.push({
    title: `${varMismatches.length} translation(s) have {{vars}} that don't match en.json`,
    items: varMismatches.map(
      m =>
        `[${m.language}] "${m.key}": en {${m.englishVars
          .map(v => `{{${v}}}`)
          .join(', ')}} vs ${m.language} {${m.translationVars
          .map(v => `{{${v}}}`)
          .join(', ')}}`,
    ),
    fix: 'Edit the locale JSON so the variable names match en.json exactly. (Manual fix — no script.)',
  });
}
if (!QUIET) {
  const lc = variableResult.results.length;
  console.log(`  checked ${lc} locale(s) for variable consistency`);
}

// ---------- 3. missing-check ----------
header('locale completeness (missing-check)');
const missingResult = await runMissingCheck();
for (const {language, missing} of missingResult.results) {
  if (missing.length === 0) continue;
  errors.push({
    title: `${language}.json is missing ${missing.length} key(s) present in en.json`,
    items: missing.map(k => `'${k}'`),
    fix: ['Run:', '  npm run i18n-fill-missing'].join('\n'),
  });
}
if (!QUIET) {
  const lc = missingResult.results.length;
  const allComplete = missingResult.results.every(r => r.missing.length === 0);
  console.log(
    `  checked ${lc} locale(s) for missing keys${allComplete ? ' — all complete' : ''}`,
  );
}

// ---------- 4. TK placeholders ----------
// "TK <english>" is the placeholder convention used by i18n-fill-missing.
// Normal during dev, but the app shouldn't ship with TK strings — translators
// (or Claude review) replace them with real translations before release.
header('TK placeholders');
const tkPlaceholders = [];
const tkByLocale = {};
{
  const files = readdirSync(TRANSLATIONS_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const language = path.parse(f).name;
    const flat = flatten(
      JSON.parse(readFileSync(path.join(TRANSLATIONS_DIR, f), 'utf8')),
    );
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value === 'string' && value.startsWith('TK ')) {
        tkPlaceholders.push({language, key, value});
      }
    }
  }
  for (const p of tkPlaceholders) {
    tkByLocale[p.language] = (tkByLocale[p.language] || 0) + 1;
  }
}
if (tkPlaceholders.length > 0) {
  const breakdown = Object.entries(tkByLocale)
    .sort()
    .map(([l, n]) => `${l}: ${n}`)
    .join(', ');
  const sample = tkPlaceholders.slice(0, 10).map(p => {
    const truncated =
      p.value.length > 80 ? p.value.slice(0, 77) + '...' : p.value;
    return `[${p.language}] '${p.key}': ${JSON.stringify(truncated)}`;
  });
  if (tkPlaceholders.length > sample.length) {
    sample.push(`... and ${tkPlaceholders.length - sample.length} more`);
  }
  warnings.push({
    title: `${tkPlaceholders.length} TK placeholder(s) awaiting real translation (${breakdown})`,
    items: sample,
    fix: [
      'Normal during development; should not ship.',
      'Run `npm run poeditor-merge` to upload TK values to POEditor (where',
      'they appear marked fuzzy for translators), then merge again later',
      'to pull real translations back. Or use Claude — see',
      '  dev-client/docs/translation-review-prompt.md',
    ].join('\n'),
  });
}
if (!QUIET) {
  console.log(`  found ${tkPlaceholders.length} TK placeholder(s)`);
}

// ---------- Output ----------
function printGroup(label, group) {
  if (group.length === 0) return;
  console.log(`\n${label} (${group.length}):`);
  for (const g of group) {
    console.log(`\n  ${g.title}`);
    for (const item of g.items) console.log(`    ${item}`);
    if (g.fix) {
      const lines = g.fix.split('\n');
      console.log(`    Fix: ${lines[0]}`);
      for (const line of lines.slice(1)) console.log(`    ${line}`);
    }
  }
}

printGroup('ERRORS', errors);
printGroup('WARNINGS', warnings);

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✓ i18n check passed: no errors, no warnings.');
} else if (errors.length === 0) {
  console.log(`\n✓ i18n check passed (${warnings.length} warning group(s)).`);
} else {
  console.log(
    `\n✗ i18n check failed: ${errors.length} error group(s), ${warnings.length} warning group(s).`,
  );
}

process.exit(errors.length > 0 ? 1 : 0);
