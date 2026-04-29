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
 * The bundled i18n gate. Runs the checks in turn and aggregates results
 * into ERRORS (block CI / pre-commit / poeditor-merge) and WARNINGS (printed
 * but non-blocking).
 *
 *   1. find-keys     — code references a key that doesn't exist in en.json    [ERROR]
 *                    — en.json has a key that no source file references       [WARNING]
 *                    — any locale catalog has an empty `"foo": {}` section    [WARNING]
 *   2. find-variables — non-en locale has different {{vars}} than en.json     [ERROR]
 *   3. missing-check  — non-en locale is missing a key present in en.json     [ERROR]
 *   4. tk-placeholders — locale value still starts with "TK " (untranslated)  [WARNING]
 *
 * Exposed as a library (runAllChecks / printChecks) so other tools — like
 * `poeditor-merge` — can invoke the gate as part of their own pre-flight
 * without spawning a subprocess. Also runnable as a CLI:
 *
 *   npm run i18n-check               # human-readable summary, exit 1 on any error
 *   npm run i18n-check -- --quiet    # only print on errors/warnings
 */

import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {flatten} from 'flat';

import {runScan} from './find-keys.mjs';
import {runValidate} from './find-variables.mjs';
import {runMissingCheck} from './missing-check.mjs';

const DEFAULTS = {
  sourceRoot: '.',
  catalogPath: 'src/translations/en.json',
  translationsDir: 'src/translations',
};

/**
 * Walk a parsed catalog and return dotted paths of every empty plain object
 * (excluding the root). Skips arrays.
 */
export function findEmptySections(obj, parentPath = []) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const out = [];
  if (parentPath.length > 0 && Object.keys(obj).length === 0) {
    out.push(parentPath.join('.'));
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    out.push(...findEmptySections(v, [...parentPath, k]));
  }
  return out;
}

/**
 * Run all four checks and return aggregated findings.
 * Pure data: no console output, no exit. Caller decides what to print.
 *
 * @param {object} [opts]
 * @param {string} [opts.sourceRoot]      Root for source-file scan.
 * @param {string} [opts.catalogPath]     Path to en.json.
 * @param {string} [opts.translationsDir] Dir containing locale .json files.
 * @returns {Promise<{errors: Findings[], warnings: Findings[], counts: object}>}
 */
export async function runAllChecks(opts = {}) {
  const {sourceRoot, catalogPath, translationsDir} = {...DEFAULTS, ...opts};
  const errors = [];
  const warnings = [];

  // ---------- 1. find-keys ----------
  const scan = runScan({roots: [sourceRoot], catalogPath});

  if (scan.inScanNotCatalog.length > 0) {
    errors.push({
      title: `${scan.inScanNotCatalog.length} key(s) referenced in source but missing from ${catalogPath}`,
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
      title: `${scan.inCatalogNotScan.length} key(s) in ${catalogPath} not referenced by any source file`,
      items: scan.inCatalogNotScan.map(k => `'${k}'`),
      fix: [
        'Eyeball the list, then run:',
        '  npm run i18n-delete-unused           # dry-run',
        '  npm run i18n-delete-unused -- --yes  # actually delete',
        'The next `npm run poeditor-merge` will propagate the deletions to POEditor.',
      ].join('\n'),
    });
  }

  // Empty sections — e.g. "speed_dial": {} left over after all child keys
  // were deleted. Operationally a kind of "unused" content, so we surface
  // it under the same warning umbrella.
  const emptySections = []; // [{language, path}]
  {
    const files = readdirSync(translationsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const language = path.parse(f).name;
      const data = JSON.parse(
        readFileSync(path.join(translationsDir, f), 'utf8'),
      );
      for (const p of findEmptySections(data)) {
        emptySections.push({language, path: p});
      }
    }
  }
  if (emptySections.length > 0) {
    const byLocale = {};
    for (const e of emptySections) {
      byLocale[e.language] = (byLocale[e.language] || 0) + 1;
    }
    const breakdown = Object.entries(byLocale)
      .sort()
      .map(([l, n]) => `${l}: ${n}`)
      .join(', ');
    warnings.push({
      title: `${emptySections.length} empty section(s) in catalogs (${breakdown})`,
      items: emptySections.map(e => `[${e.language}] '${e.path}'`),
      fix: [
        'Run:',
        '  npm run i18n-delete-unused           # dry-run',
        '  npm run i18n-delete-unused -- --yes  # actually prune',
      ].join('\n'),
    });
  }

  // ---------- 2. find-variables ----------
  const variableResult = await runValidate();
  const varMismatches = variableResult.results.flatMap(
    ({language, mismatches}) => mismatches.map(m => ({language, ...m})),
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

  // ---------- 3. missing-check ----------
  const missingResult = await runMissingCheck();
  for (const {language, missing} of missingResult.results) {
    if (missing.length === 0) continue;
    errors.push({
      title: `${language}.json is missing ${missing.length} key(s) present in en.json`,
      items: missing.map(k => `'${k}'`),
      fix: ['Run:', '  npm run i18n-fill-missing'].join('\n'),
    });
  }

  // ---------- 4. TK placeholders ----------
  // "TK <english>" is the placeholder convention used by i18n-fill-missing.
  // Normal during dev, but the app shouldn't ship with TK strings — translators
  // (or Claude review) replace them with real translations before release.
  const tkPlaceholders = [];
  const tkByLocale = {};
  {
    const files = readdirSync(translationsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const language = path.parse(f).name;
      const flat = flatten(
        JSON.parse(readFileSync(path.join(translationsDir, f), 'utf8')),
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

  return {
    errors,
    warnings,
    counts: {
      sourceKeys: scan.scanKeys.length,
      catalogKeys: scan.catalogKeys.size,
      dynamicPrefixes: scan.scanPrefixes.length,
      localesChecked: variableResult.results.length,
      tkPlaceholders: tkPlaceholders.length,
      missingKeysComplete: missingResult.results.every(
        r => r.missing.length === 0,
      ),
    },
  };
}

/**
 * Print the aggregated findings to stdout in a human-readable form.
 */
export function printChecks({errors, warnings}) {
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
}

/** Print the one-line pass/fail summary. */
export function printSummary({errors, warnings}) {
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✓ i18n check passed: no errors, no warnings.');
  } else if (errors.length === 0) {
    console.log(`\n✓ i18n check passed (${warnings.length} warning group(s)).`);
  } else {
    console.log(
      `\n✗ i18n check failed: ${errors.length} error group(s), ${warnings.length} warning group(s).`,
    );
  }
}

// ---------- CLI entry point ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const QUIET = args.includes('--quiet');

  const result = await runAllChecks();

  if (!QUIET) {
    const c = result.counts;
    console.log(`\n=== source ↔ catalog (find-keys) ===`);
    console.log(
      `  scanned ${c.sourceKeys} keys in source / ${c.catalogKeys} in catalog · ${c.dynamicPrefixes} dynamic prefixes`,
    );
    console.log(`\n=== locale variable consistency (find-variables) ===`);
    console.log(`  checked ${c.localesChecked} locale(s) for variable consistency`);
    console.log(`\n=== locale completeness (missing-check) ===`);
    console.log(
      `  checked ${c.localesChecked} locale(s) for missing keys${
        c.missingKeysComplete ? ' — all complete' : ''
      }`,
    );
    console.log(`\n=== TK placeholders ===`);
    console.log(`  found ${c.tkPlaceholders} TK placeholder(s)`);
  }

  printChecks(result);
  printSummary(result);
  process.exit(result.errors.length > 0 ? 1 : 0);
}
