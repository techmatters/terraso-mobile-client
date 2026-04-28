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
 * Downloads .po files from POEditor and saves them to locales/po/.
 *
 * Requires POEDITOR_API_TOKEN and POEDITOR_PROJECT_ID in the .env file.
 *
 * Safety: refuses to run if there are uncommitted changes to any .po files
 * in locales/po/, so you never lose work.
 *
 * Usage:
 *   npm run poeditor-download                # all languages except en
 *   npm run poeditor-download -- en          # just English
 *   npm run poeditor-download -- es fr       # just Spanish and French
 *   npm run poeditor-download -- en es fr    # English, Spanish, and French
 *
 * Options:
 *   --project <id>      Override POEDITOR_PROJECT_ID from .env
 *   --output-dir <dir>  Override default output directory (locales/po).
 *                        Skips the git safety check when set.
 */

import {execSync} from 'child_process';
import {writeFile} from 'fs/promises';
import path from 'path';

const API_TOKEN = process.env.POEDITOR_API_TOKEN;

// --- Parse arguments ---

const rawArgs = process.argv.slice(2);
let projectId = process.env.POEDITOR_PROJECT_ID;
let outputDir = 'locales/po';
const requestedLangs = [];

let force = false;

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--project' && i + 1 < rawArgs.length) {
    projectId = rawArgs[++i];
  } else if (rawArgs[i] === '--output-dir' && i + 1 < rawArgs.length) {
    outputDir = rawArgs[++i];
  } else if (rawArgs[i] === '--force') {
    force = true;
  } else {
    requestedLangs.push(rawArgs[i]);
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

// --- Check for uncommitted .po files (only for default output dir) ---

const usingDefaultDir = outputDir === 'locales/po';

function hasUncommittedPoFiles() {
  try {
    // Returns non-empty string if there are changes (staged or unstaged) to .po files
    const status = execSync(`git status --porcelain -- "${outputDir}"/*.po`, {
      encoding: 'utf-8',
    }).trim();
    return status.length > 0;
  } catch {
    // git command failed — be safe and refuse
    return true;
  }
}

if (usingDefaultDir && !force && hasUncommittedPoFiles()) {
  console.error(`There are uncommitted changes to .po files in ${outputDir}/.`);
  console.error('Please commit or stash them before downloading new files.');
  process.exit(1);
}

// --- POEditor API helpers ---

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

async function listLanguages() {
  const json = await apiCall('languages/list', {id: projectId});
  return json.result.languages.map(lang => lang.code);
}

async function exportLanguage(lang) {
  const json = await apiCall('projects/export', {
    id: projectId,
    language: lang,
    type: 'po',
  });
  return json.result.url;
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

// --- Main ---

async function main() {
  console.log('Fetching project languages...');
  const allLanguages = await listLanguages();
  console.log(`  Found in project: ${allLanguages.join(', ')}`);

  let languages;
  if (requestedLangs.length > 0) {
    // Validate that requested languages exist in the project
    const unknown = requestedLangs.filter(l => !allLanguages.includes(l));
    if (unknown.length > 0) {
      console.error(`Unknown language(s): ${unknown.join(', ')}`);
      console.error(`Available: ${allLanguages.join(', ')}`);
      process.exit(1);
    }
    languages = requestedLangs;
  } else {
    // Default: all languages except English (en.po is generated locally from en.json)
    languages = allLanguages.filter(l => l !== 'en');
  }

  console.log(`Downloading: ${languages.join(', ')}`);
  for (const lang of languages) {
    process.stdout.write(`  ${lang}...`);
    const url = await exportLanguage(lang);
    const outputPath = path.join(outputDir, `${lang}.po`);
    await downloadFile(url, outputPath);
    console.log(` saved to ${outputPath}`);
  }

  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
