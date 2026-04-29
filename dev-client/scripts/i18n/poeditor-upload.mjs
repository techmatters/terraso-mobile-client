/*
 * Copyright © 2024 Technology Matters
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
 * Uploads .po files to POEditor.
 *
 * Requires POEDITOR_API_TOKEN and POEDITOR_PROJECT_ID in the .env file.
 *
 * Usage:
 *   npm run poeditor-upload -- locales/po/es.po locales/po/fr.po
 *   npm run poeditor-upload -- locales/fixes/sw-fixes.po
 *   npm run poeditor-upload -- --sync-terms locales/po/en.po
 *
 * Language is inferred from the filename:
 *   es.po       → language "es"
 *   sw-fixes.po → language "sw"
 *
 * Options:
 *   --sync-terms     Use "terms_translations" mode and sync terms (add new,
 *                    remove deleted). Use this when uploading en.po to update
 *                    the source language. Without this flag, only translations
 *                    are updated (existing terms are not added or removed).
 *
 *   --fuzzy-trigger  Mark corresponding translations in other languages as
 *                    fuzzy in POEditor, so translators know to review them.
 *
 *   --project <id>   Override POEDITOR_PROJECT_ID from .env.
 */

import {readFile} from 'fs/promises';
import path from 'path';

// POEditor rate-limits uploads to 1 per 20s (free) or 1 per 10s (paid).
const UPLOAD_DELAY_MS = 21000;

const API_TOKEN = process.env.POEDITOR_API_TOKEN;

// --- Parse arguments ---

const rawArgs = process.argv.slice(2);
let projectId = process.env.POEDITOR_PROJECT_ID;
let syncTerms = false;
let fuzzyTrigger = false;
const files = [];

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--project' && i + 1 < rawArgs.length) {
    projectId = rawArgs[++i];
  } else if (rawArgs[i] === '--sync-terms') {
    syncTerms = true;
  } else if (rawArgs[i] === '--fuzzy-trigger') {
    fuzzyTrigger = true;
  } else if (!rawArgs[i].startsWith('--')) {
    files.push(rawArgs[i]);
  }
}

// --- Validate config ---

const missing = [];
if (!API_TOKEN) missing.push('POEDITOR_API_TOKEN');
if (!projectId) missing.push('POEDITOR_PROJECT_ID');
if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}`,
  );
  console.error('Add them to your .env file and re-run.');
  process.exit(1);
}

if (files.length === 0) {
  console.error(
    'Usage: npm run poeditor-upload -- [--sync-terms] [--fuzzy-trigger] <file.po> ...',
  );
  console.error('');
  console.error('Examples:');
  console.error('  npm run poeditor-upload -- locales/po/es.po');
  console.error('  npm run poeditor-upload -- --sync-terms locales/po/en.po');
  console.error(
    '  npm run poeditor-upload -- --fuzzy-trigger locales/fixes/sw-fixes.po',
  );
  process.exit(1);
}

// --- Helpers ---

function inferLanguage(filePath) {
  const basename = path.basename(filePath, '.po');
  // Handle "sw-fixes" → "sw", "es" → "es"
  return basename.split('-')[0];
}

async function uploadFile(filePath) {
  const language = inferLanguage(filePath);
  const fileContent = await readFile(filePath);
  const blob = new Blob([fileContent], {type: 'application/octet-stream'});

  const formData = new FormData();
  formData.append('api_token', API_TOKEN);
  formData.append('id', projectId);
  formData.append(
    'updating',
    syncTerms ? 'terms_translations' : 'translations',
  );
  formData.append('file', blob, path.basename(filePath));
  formData.append('language', language);
  formData.append('overwrite', '1');
  if (syncTerms) {
    formData.append('sync_terms', '1');
  }
  if (fuzzyTrigger) {
    formData.append('fuzzy_trigger', '1');
  }

  const response = await fetch('https://api.poeditor.com/v2/projects/upload', {
    method: 'POST',
    body: formData,
  });

  const json = await response.json();
  if (json.response.status !== 'success') {
    throw new Error(`POEditor API error: ${JSON.stringify(json.response)}`);
  }

  return json.result;
}

function formatResult(result) {
  const parts = [];
  const {terms, translations} = result;

  if (terms) {
    const termParts = [];
    if (terms.parsed) termParts.push(`${terms.parsed} parsed`);
    if (terms.added) termParts.push(`${terms.added} added`);
    if (terms.deleted) termParts.push(`${terms.deleted} deleted`);
    if (termParts.length > 0) parts.push(`terms: ${termParts.join(', ')}`);
  }

  if (translations) {
    const transParts = [];
    if (translations.parsed) transParts.push(`${translations.parsed} parsed`);
    if (translations.added) transParts.push(`${translations.added} added`);
    if (translations.updated)
      transParts.push(`${translations.updated} updated`);
    if (transParts.length > 0)
      parts.push(`translations: ${transParts.join(', ')}`);
  }

  return parts.join(' | ') || 'no changes';
}

// --- Main ---

async function main() {
  const mode = syncTerms ? 'terms_translations' : 'translations';
  console.log(
    `Upload mode: ${mode}${fuzzyTrigger ? ' (fuzzy trigger ON)' : ''}`,
  );
  console.log('');

  let hasError = false;

  for (let i = 0; i < files.length; i++) {
    if (i > 0) {
      process.stdout.write(
        `  (waiting ${UPLOAD_DELAY_MS / 1000}s for rate limit...)`,
      );
      await new Promise(r => setTimeout(r, UPLOAD_DELAY_MS));
      console.log('');
    }
    const filePath = files[i];
    const language = inferLanguage(filePath);
    process.stdout.write(`  ${language} (${path.basename(filePath)})...`);

    try {
      const result = await uploadFile(filePath);
      console.log(` ${formatResult(result)}`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      hasError = true;
    }
  }

  console.log('');
  if (hasError) {
    console.error('Some uploads failed.');
    process.exit(1);
  }
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
