#!/usr/bin/env node

/**
 * Extract a section from two translation JSON files for side-by-side review.
 *
 * Usage:
 *   node scripts/localization/extract-section.mjs <lang> [section]
 *
 * Examples:
 *   node scripts/localization/extract-section.mjs es              # list sections with sizes
 *   node scripts/localization/extract-section.mjs es site         # extract site section
 *   node scripts/localization/extract-section.mjs es soil.texture # extract soil.texture
 *   node scripts/localization/extract-section.mjs es soil.match_info --batch 1  # first 50 match_info entries
 *   node scripts/localization/extract-section.mjs es soil.match_info --batch 2  # next 50
 *
 * Output: JSON with { "en": { ... }, "<lang>": { ... } } for the requested section.
 * Large sections (>30k combined) print a warning to stderr.
 */
import {readFileSync} from 'fs';
import {resolve} from 'path';

const TRANSLATIONS_DIR = resolve(import.meta.dirname, '../../src/translations');
const BATCH_SIZE = 20;

function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function getAllSections(obj, prefix = '') {
  const sections = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).some(v => typeof v === 'object' && v !== null)
    ) {
      // Has sub-objects — list both this level and children
      sections.push(fullKey);
      sections.push(...getAllSections(value, fullKey));
    } else {
      sections.push(fullKey);
    }
  }
  return sections;
}

function flatSize(obj) {
  return JSON.stringify(obj).length;
}

const args = process.argv.slice(2);

// Parse --batch flag
let batchNum = null;
const batchIdx = args.indexOf('--batch');
if (batchIdx !== -1) {
  batchNum = parseInt(args[batchIdx + 1], 10);
  args.splice(batchIdx, 2);
}

const [lang, section] = args;

if (!lang) {
  console.error(
    'Usage: extract-section.mjs <lang> [section] [--batch N]\n' +
      '       extract-section.mjs <lang>           # list sections with sizes\n' +
      '       extract-section.mjs es site          # extract en + es for "site"\n' +
      '       extract-section.mjs es soil.match_info --batch 1  # batch of match_info',
  );
  process.exit(1);
}

const en = JSON.parse(
  readFileSync(resolve(TRANSLATIONS_DIR, 'en.json'), 'utf-8'),
);
const other = JSON.parse(
  readFileSync(resolve(TRANSLATIONS_DIR, `${lang}.json`), 'utf-8'),
);

if (!section) {
  // List mode: show all leaf sections with sizes
  console.log(`Sections in en.json (with combined en+${lang} sizes):\n`);
  const topKeys = Object.keys(en);
  for (const key of topKeys) {
    const enVal = en[key];
    const otherVal = other[key];
    const combinedSize = flatSize(enVal) + flatSize(otherVal || {});
    const sizeStr = (combinedSize / 1024).toFixed(1) + 'k';
    const marker = combinedSize > 30000 ? ' [LARGE - use sub-sections]' : '';
    console.log(`  ${key.padEnd(25)} ${sizeStr.padStart(8)}${marker}`);

    // Show sub-sections for large keys
    if (combinedSize > 30000 && typeof enVal === 'object' && enVal !== null) {
      for (const subKey of Object.keys(enVal)) {
        const enSub = enVal[subKey];
        const otherSub = otherVal?.[subKey] || {};
        const subSize = flatSize(enSub) + flatSize(otherSub);
        const subSizeStr = (subSize / 1024).toFixed(1) + 'k';
        const subMarker = subSize > 30000 ? ' [LARGE - use --batch N]' : '';
        console.log(
          `    ${(key + '.' + subKey).padEnd(35)} ${subSizeStr.padStart(8)}${subMarker}`,
        );
      }
    }
  }
  process.exit(0);
}

let enSection = getNestedValue(en, section);
let otherSection = getNestedValue(other, section);

if (enSection === undefined) {
  console.error(`Section "${section}" not found in en.json`);
  process.exit(1);
}

// Handle batching for large sections with many keys
if (batchNum !== null) {
  if (typeof enSection !== 'object' || enSection === null) {
    console.error(`Section "${section}" is not an object, cannot batch`);
    process.exit(1);
  }
  const allKeys = Object.keys(enSection);
  const start = (batchNum - 1) * BATCH_SIZE;
  const end = start + BATCH_SIZE;
  const batchKeys = allKeys.slice(start, end);
  const totalBatches = Math.ceil(allKeys.length / BATCH_SIZE);

  if (batchKeys.length === 0) {
    console.error(
      `Batch ${batchNum} is empty (${allKeys.length} keys, ${totalBatches} batches)`,
    );
    process.exit(1);
  }

  console.error(
    `Batch ${batchNum}/${totalBatches} (keys ${start + 1}-${Math.min(end, allKeys.length)} of ${allKeys.length})`,
  );

  const enBatch = {};
  const otherBatch = {};
  for (const key of batchKeys) {
    enBatch[key] = enSection[key];
    if (otherSection?.[key] !== undefined) {
      otherBatch[key] = otherSection[key];
    }
  }
  enSection = enBatch;
  otherSection = otherBatch;
}

const combinedSize = flatSize(enSection) + flatSize(otherSection || {});
if (combinedSize > 30000) {
  console.error(
    `Warning: combined size is ${(combinedSize / 1024).toFixed(1)}k — consider using sub-sections or --batch`,
  );
}

const output = {
  _meta: {
    section,
    lang,
    batch: batchNum,
    en_keys: Object.keys(typeof enSection === 'object' ? enSection : {}).length,
  },
  en: enSection,
  [lang]: otherSection || {},
};

console.log(JSON.stringify(output, null, 2));
