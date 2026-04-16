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
 * Creates a temporary POEditor project seeded with data from the real project.
 *
 * Requires POEDITOR_API_TOKEN and POEDITOR_PROJECT_ID in the .env file.
 *
 * Usage:
 *   npm run poeditor-create-test-project              # create and seed
 *   npm run poeditor-create-test-project -- --cleanup <id>  # delete a test project
 *
 * What it does:
 *   1. Creates a new POEditor project named "terraso-mobile-test-<timestamp>"
 *   2. Adds all languages found in src/translations/
 *   3. Seeds it by downloading all PO files from the real project and uploading them
 *   4. Prints the test project ID for use with other scripts (e.g. --project <id>)
 */

import {execSync} from 'child_process';
import {existsSync, mkdirSync, readdirSync, rmSync, writeFileSync} from 'fs';
import path from 'path';

// POEditor rate-limits uploads to 1 per 20s (free) or 1 per 10s (paid).
const UPLOAD_DELAY_MS = 21000;

const API_TOKEN = process.env.POEDITOR_API_TOKEN;
const REAL_PROJECT_ID = process.env.POEDITOR_PROJECT_ID;

// --- Validate config ---

const missingVars = [];
if (!API_TOKEN) missingVars.push('POEDITOR_API_TOKEN');
if (!REAL_PROJECT_ID) missingVars.push('POEDITOR_PROJECT_ID');
if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(', ')}`,
  );
  process.exit(1);
}

// --- Handle arguments ---

const args = process.argv.slice(2);

if (args[0] === '--cleanup' && args[1]) {
  await deleteProject(args[1]);
  process.exit(0);
}

// Discover languages from JSON translation files, with 'en' always first
const LANGUAGES = readdirSync('src/translations')
  .filter(f => f.endsWith('.json'))
  .map(f => path.basename(f, '.json'))
  .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));

// --- API helpers ---

async function apiCall(endpoint, data) {
  const body = new URLSearchParams({api_token: API_TOKEN, ...data});
  const response = await fetch(`https://api.poeditor.com/v2/${endpoint}`, {
    method: 'POST',
    body,
  });
  const json = await response.json();
  if (json.response.status !== 'success') {
    throw new Error(
      `POEditor API error (${endpoint}): ${JSON.stringify(json.response)}`,
    );
  }
  return json;
}

async function deleteProject(id) {
  console.log(`Deleting project ${id}...`);
  await apiCall('projects/delete', {id});
  console.log('Deleted.');
}

// --- Script runner ---

function runScript(scriptName, scriptArgs) {
  const cmd = `node --env-file=.env scripts/localization/${scriptName} ${scriptArgs}`;
  console.log(`  $ ${cmd}`);
  execSync(cmd, {stdio: 'inherit', cwd: process.cwd()});
}

// --- Main ---

const SEED_DIR = '/tmp/poeditor-test-seed';

async function main() {
  console.log('=== Create POEditor Test Project ===\n');
  console.log(`Languages: ${LANGUAGES.join(', ')}\n`);

  // -------------------------------------------------------
  // Step 1: Create test project
  // -------------------------------------------------------
  console.log('Step 1: Creating test project...');
  const createResult = await apiCall('projects/add', {
    name: `terraso-mobile-test-${Date.now()}`,
    description: 'Temporary project for testing localization scripts',
  });
  const testId = String(createResult.result.project.id);
  console.log(`  Created project ID: ${testId}`);
  console.log(
    `  (To clean up later: npm run poeditor-create-test-project -- --cleanup ${testId})\n`,
  );

  try {
    // -------------------------------------------------------
    // Step 2: Add languages
    // -------------------------------------------------------
    console.log('Step 2: Adding languages...');
    for (const lang of LANGUAGES) {
      await apiCall('languages/add', {id: testId, language: lang});
      process.stdout.write(`  ${lang} `);
    }
    console.log('\n');

    // -------------------------------------------------------
    // Step 3: Download PO files from real project
    // -------------------------------------------------------
    console.log('Step 3: Downloading from real project...');

    if (existsSync(SEED_DIR)) {
      rmSync(SEED_DIR, {recursive: true});
    }
    mkdirSync(SEED_DIR, {recursive: true});

    for (const lang of LANGUAGES) {
      const exportJson = await apiCall('projects/export', {
        id: REAL_PROJECT_ID,
        language: lang,
        type: 'po',
      });
      const response = await fetch(exportJson.result.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(path.join(SEED_DIR, `${lang}.po`), buffer);
      process.stdout.write(`  ${lang} `);
    }
    console.log('\n');

    // -------------------------------------------------------
    // Step 4: Upload seed data to test project
    // -------------------------------------------------------

    // 4a: Upload en.po first (establishes terms)
    console.log('Step 4: Uploading seed data to test project...');
    console.log('  Uploading en.po (with --sync-terms)...');
    runScript(
      'poeditor-upload.mjs',
      `--project ${testId} --sync-terms ${SEED_DIR}/en.po`,
    );

    // 4b: Upload other languages (wait for rate limit after en.po upload)
    console.log(`  (waiting ${UPLOAD_DELAY_MS / 1000}s for rate limit...)`);
    await new Promise(r => setTimeout(r, UPLOAD_DELAY_MS));

    console.log('  Uploading other languages...');
    const otherFiles = LANGUAGES.filter(l => l !== 'en')
      .map(l => `${SEED_DIR}/${l}.po`)
      .join(' ');
    runScript('poeditor-upload.mjs', `--project ${testId} ${otherFiles}`);
    console.log('');

    // -------------------------------------------------------
    // Done
    // -------------------------------------------------------
    console.log('=== Test project ready ===\n');
    console.log(`  Project ID: ${testId}`);
    console.log(`  Seed files: ${SEED_DIR}/\n`);
    console.log('Use with other scripts:');
    console.log(`  npm run poeditor-merge -- --project ${testId} --dry-run`);
    console.log(`  npm run poeditor-merge -- --project ${testId}`);
    console.log(`  npm run poeditor-download -- --project ${testId}`);
    console.log(`  npm run poeditor-upload -- --project ${testId} <file.po>\n`);
    console.log('Clean up when done:');
    console.log(
      `  npm run poeditor-create-test-project -- --cleanup ${testId}`,
    );
  } catch (err) {
    console.error(`\nFailed: ${err.message}`);
    console.error(
      `\nTest project was NOT deleted. Clean up with:\n  npm run poeditor-create-test-project -- --cleanup ${testId}`,
    );
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
