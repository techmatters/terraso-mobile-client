#!/usr/bin/env node

/**
 * Fill missing translation keys with "TK <english value>" placeholders.
 *
 * Reads en.json as the source of truth, then for each other language file,
 * adds any missing keys with the English value prefixed by "TK ".
 *
 * Usage:
 *   npm run i18n-fill-missing           # fill all languages
 *   npm run i18n-fill-missing -- es fr   # fill specific languages
 */
import {readdirSync, readFileSync, writeFileSync} from 'fs';
import path from 'path';

import {flatten, unflatten} from 'flat';

const TRANSLATIONS_DIR = path.resolve(
  import.meta.dirname,
  '../../src/translations',
);

const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
const en = JSON.parse(readFileSync(enPath, 'utf-8'));
const enFlat = flatten(en);
const enKeys = Object.keys(enFlat);

// Determine which languages to process
const requestedLangs = process.argv.slice(2);
const allLangs = readdirSync(TRANSLATIONS_DIR)
  .filter(f => f.endsWith('.json') && f !== 'en.json')
  .map(f => path.basename(f, '.json'));

const langs =
  requestedLangs.length > 0
    ? requestedLangs.filter(l => {
        if (!allLangs.includes(l)) {
          console.error(`Warning: ${l}.json not found, skipping`);
          return false;
        }
        return true;
      })
    : allLangs;

let totalAdded = 0;

for (const lang of langs) {
  const langPath = path.join(TRANSLATIONS_DIR, `${lang}.json`);
  const langJson = JSON.parse(readFileSync(langPath, 'utf-8'));
  const langFlat = flatten(langJson);
  const langKeys = new Set(Object.keys(langFlat));

  const missing = enKeys.filter(k => !langKeys.has(k));

  if (missing.length === 0) {
    continue;
  }

  for (const key of missing) {
    langFlat[key] = `TK ${enFlat[key]}`;
  }

  const result = unflatten(langFlat);
  writeFileSync(langPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`${lang}: added ${missing.length} TK placeholder(s)`);
  totalAdded += missing.length;
}

if (totalAdded === 0) {
  console.log('All languages are complete — no missing keys.');
} else {
  console.log(`\nDone. Added ${totalAdded} TK placeholder(s) total.`);
  console.log('Run: npm run format');
}
