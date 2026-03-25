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
 * Bidirectional merge between local JSON translations and POEditor.
 *
 * Detects conflicts between local and POEditor changes since the last sync,
 * uploads local changes, downloads the merged result, and commits with a tag.
 *
 * Requires POEDITOR_API_TOKEN and POEDITOR_PROJECT_ID in the .env file.
 * Requires the file `locales/sync-tag` to contain the tag name of the last sync
 * (e.g. `translations/20260310T0109Z`). This tag must exist in git.
 *
 * Usage:
 *   npm run poeditor-merge                          # full merge
 *   npm run poeditor-merge -- --dry-run              # detect conflicts only, no changes
 *   npm run poeditor-merge -- --verbose              # full merge with detailed logging
 *   npm run poeditor-merge -- --project <id>         # use a different POEditor project
 *   npm run poeditor-merge -- --no-commit            # merge but skip commit/tag (for testing)
 */

import {execSync} from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import os from 'os';
import path from 'path';

import {diffWords} from 'diff';
import gettextParser from 'gettext-parser';
import {i18nextToPo} from 'i18next-conv';

// POEditor rate-limits uploads to 1 per 20s (free) or 1 per 10s (paid).
const UPLOAD_DELAY_MS = 21000;

// Directory to save POEditor PO files before uploading (safety backup)
const PO_SAVE_DIR = 'locales/po-save';

// File that records the tag name of the last merged sync
const SYNC_TAG_FILE = 'locales/sync-tag';

const API_TOKEN = process.env.POEDITOR_API_TOKEN;
let PROJECT_ID = process.env.POEDITOR_PROJECT_ID;

// Discover languages from JSON translation files, with 'en' always first
const LANGUAGES = readdirSync('src/translations')
  .filter(f => f.endsWith('.json'))
  .map(f => path.basename(f, '.json'))
  .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));

// --- Parse arguments ---

function printUsage() {
  console.log('Usage: npm run poeditor-merge [-- <options>]');
  console.log('');
  console.log('Options:');
  console.log(
    '  --dry-run        Detect conflicts and preview changes without modifying anything',
  );
  console.log(
    '  --no-commit      Upload and download but skip commit and tag (for testing)',
  );
  console.log(
    '  --verbose        Show detailed logging and change preview during full run',
  );
  console.log(
    '  --project <id>   Use a different POEditor project (overrides .env)',
  );
  console.log('  --help           Show this help message');
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_COMMIT = args.includes('--no-commit');
const VERBOSE = args.includes('--verbose');
const knownFlags = new Set([
  '--dry-run',
  '--no-commit',
  '--verbose',
  '--project',
  '--help',
]);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project' && i + 1 < args.length) {
    PROJECT_ID = args[++i];
  } else if (args[i] === '--help') {
    printUsage();
    process.exit(0);
  } else if (args[i].startsWith('--') && !knownFlags.has(args[i])) {
    console.error(`Unknown option: ${args[i]}\n`);
    printUsage();
    process.exit(1);
  }
}

function verbose(...msg) {
  if (VERBOSE) console.log('  [verbose]', ...msg);
}

// --- Validate config ---

const missing = [];
if (!API_TOKEN) missing.push('POEDITOR_API_TOKEN');
if (!PROJECT_ID) missing.push('POEDITOR_PROJECT_ID');
if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}`,
  );
  console.error('Add them to your .env file and re-run.');
  process.exit(1);
}

// --- Helpers ---

/** Parse a PO buffer into a Map<msgid, msgstr>. Skips the empty-string header entry. */
function parsePo(buffer) {
  const parsed = gettextParser.po.parse(buffer);
  const map = new Map();
  const contexts = parsed.translations;
  for (const ctxKey of Object.keys(contexts)) {
    for (const [msgid, entry] of Object.entries(contexts[ctxKey])) {
      if (msgid === '') continue; // skip header
      const msgstr = (entry.msgstr || []).join('');
      map.set(msgid, msgstr);
    }
  }
  return map;
}

/** Convert a local JSON translation file to PO buffer (same options as transform-to.mjs). */
async function jsonToPo(jsonPath, lang) {
  const json = readFileSync(jsonPath);
  const result = await i18nextToPo(lang, json, {
    project: 'Terraso',
    ctxSeparator: '',
    compatibilityJSON: 'v4',
    foldLength: 0,
  });
  return Buffer.from(result);
}

/** Get the PO file at a given tag via git show. */
function getTaggedPo(lang, tag) {
  const gitPath = `${tag}:dev-client/locales/po/${lang}.po`;
  verbose(`git show ${gitPath}`);
  try {
    const buf = execSync(`git show ${gitPath}`, {
      encoding: 'buffer',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    verbose(`  ${lang} tagged PO: ${buf.length} bytes`);
    return buf;
  } catch {
    verbose(`  ${lang} tagged PO: not found`);
    return null;
  }
}

/** Download a PO file directly from POEditor API. */
async function downloadPoFromPoeditor(lang) {
  verbose(`Downloading ${lang} from POEditor API...`);
  const body = new URLSearchParams({
    api_token: API_TOKEN,
    id: PROJECT_ID,
    language: lang,
    type: 'po',
  });
  const response = await fetch('https://api.poeditor.com/v2/projects/export', {
    method: 'POST',
    body,
  });
  const json = await response.json();
  if (json.response.status !== 'success') {
    throw new Error(`POEditor API error: ${JSON.stringify(json.response)}`);
  }
  verbose(`  ${lang} export URL: ${json.result.url}`);
  const fileResponse = await fetch(json.result.url);
  const buf = Buffer.from(await fileResponse.arrayBuffer());
  verbose(`  ${lang} POEditor PO: ${buf.length} bytes`);
  return buf;
}

/**
 * Diff two maps (current vs baseline).
 * Returns { added: Map, removed: Set, changed: Map<msgid, {old, new}> }
 */
function diffMaps(currentMap, baselineMap) {
  const added = new Map();
  const removed = new Set();
  const changed = new Map();

  // Find added and changed entries
  for (const [msgid, msgstr] of currentMap) {
    if (!baselineMap.has(msgid)) {
      added.set(msgid, msgstr);
    } else if (baselineMap.get(msgid) !== msgstr) {
      changed.set(msgid, {old: baselineMap.get(msgid), new: msgstr});
    }
  }

  // Find removed entries
  for (const msgid of baselineMap.keys()) {
    if (!currentMap.has(msgid)) {
      removed.add(msgid);
    }
  }

  return {added, removed, changed};
}

/** Build a minimal PO file containing only the given entries. If fuzzy is true, mark all entries as fuzzy. */
function buildPartialPo(entries, {fuzzy = false} = {}) {
  const data = {
    charset: 'utf-8',
    headers: {
      'content-type': 'text/plain; charset=UTF-8',
    },
    translations: {
      '': {},
    },
  };
  for (const [msgid, msgstr] of entries) {
    const entry = {
      msgid,
      msgstr: [msgstr],
    };
    if (fuzzy) {
      entry.comments = {flag: 'fuzzy'};
    }
    data.translations[''][msgid] = entry;
  }
  return gettextParser.po.compile(data);
}

// Build --project flag for passing to sub-scripts (upload/download)
const projectArg =
  PROJECT_ID !== process.env.POEDITOR_PROJECT_ID
    ? `--project ${PROJECT_ID}`
    : '';

/** Run a localization script via execSync. Skips if DRY_RUN. */
function runScript(scriptName, scriptArgs) {
  const cmd =
    `node --env-file=.env scripts/localization/${scriptName} ${projectArg} ${scriptArgs}`.replace(
      /  +/g,
      ' ',
    );
  if (VERBOSE || DRY_RUN) console.log(`  $ ${cmd}`);
  if (!DRY_RUN) {
    execSync(cmd, {stdio: 'inherit', cwd: process.cwd()});
  }
}

/** Run a plain npm script. Skips if DRY_RUN. */
function runNpmScript(name) {
  const cmd = `npm run ${name}`;
  if (VERBOSE || DRY_RUN) console.log(`  $ ${cmd}`);
  if (!DRY_RUN) {
    execSync(cmd, {stdio: 'inherit', cwd: process.cwd()});
  }
}

function diffSize(diff) {
  return diff.added.size + diff.removed.size + diff.changed.size;
}

/** Escape a string for safe embedding in HTML. */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Make invisible whitespace characters visible. */
function showWhitespace(str) {
  return str.replace(/\n/g, '↵\n').replace(/\t/g, '→');
}

/** Render a word diff between two strings as HTML, bolding the changed parts. */
function renderWordDiff(oldStr, newStr, side) {
  const parts = diffWords(showWhitespace(oldStr), showWhitespace(newStr));
  let html = '';
  for (const part of parts) {
    const text = escapeHtml(part.value);
    if (side === 'old') {
      if (part.removed) {
        html += `<b>${text}</b>`;
      } else if (!part.added) {
        html += text;
      }
    } else {
      if (part.added) {
        html += `<b>${text}</b>`;
      } else if (!part.removed) {
        html += text;
      }
    }
  }
  return html;
}

/**
 * Generate an HTML change report and write it to reportDir.
 * Returns {path, uploadCount, uploadLangs, downloadCount, downloadLangs}.
 */
function generateChangeReport(langData, reportDir) {
  // Separate local-only and POEditor-only changes
  // (convergent changes appear in both diffs but are effectively no-ops)
  function getExclusiveChanges(diff, otherDiff, baselineMap) {
    return {
      added: new Map([...diff.added].filter(([k]) => !otherDiff.added.has(k))),
      removed: new Map(
        [...diff.removed]
          .filter(k => !otherDiff.removed.has(k))
          .map(k => [k, baselineMap.get(k) ?? '']),
      ),
      changed: new Map(
        [...diff.changed].filter(([k]) => !otherDiff.changed.has(k)),
      ),
    };
  }

  // Upload to POEditor (local-only changes)
  const uploadLangs = [];
  for (const lang of LANGUAGES) {
    if (!langData[lang]) continue;
    const exclusive = getExclusiveChanges(
      langData[lang].localDiff,
      langData[lang].poeditorDiff,
      langData[lang].taggedMap,
    );
    if (diffSize(exclusive) > 0) {
      uploadLangs.push({lang, diff: exclusive});
    }
  }

  // Download to local JSON (POEditor-only changes)
  const downloadLangs = [];
  for (const lang of LANGUAGES) {
    if (!langData[lang]) continue;
    const exclusive = getExclusiveChanges(
      langData[lang].poeditorDiff,
      langData[lang].localDiff,
      langData[lang].taggedMap,
    );
    if (diffSize(exclusive) > 0) {
      downloadLangs.push({lang, diff: exclusive});
    }
  }

  let uploadCount = 0;
  for (const {diff} of uploadLangs) {
    uploadCount += diff.added.size + diff.changed.size + diff.removed.size;
  }
  let downloadCount = 0;
  for (const {diff} of downloadLangs) {
    downloadCount += diff.added.size + diff.changed.size + diff.removed.size;
  }

  const mode = DRY_RUN ? 'Dry Run' : NO_COMMIT ? 'No Commit' : 'Full Merge';
  const date = new Date()
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, ' UTC');

  function renderDiffTable(diff) {
    let rows = '';
    for (const [msgid, value] of diff.added) {
      rows += `<tr class="added"><td>${escapeHtml(msgid.replace(/##/g, '.'))}</td><td></td><td>${escapeHtml(value)}</td></tr>\n`;
    }
    for (const [msgid, {old: oldVal, new: newVal}] of diff.changed) {
      rows += `<tr class="changed"><td>${escapeHtml(msgid.replace(/##/g, '.'))}</td><td>${renderWordDiff(oldVal, newVal, 'old')}</td><td>${renderWordDiff(oldVal, newVal, 'new')}</td></tr>\n`;
    }
    for (const [msgid, oldVal] of diff.removed) {
      rows += `<tr class="removed"><td>${escapeHtml(msgid.replace(/##/g, '.'))}</td><td>${escapeHtml(oldVal)}</td><td></td></tr>\n`;
    }
    return `<table>
<thead><tr><th>Key</th><th>Old</th><th>New</th></tr></thead>
<tbody>
${rows}</tbody>
</table>`;
  }

  let uploadHtml = '';
  if (uploadLangs.length > 0) {
    for (const {lang, diff} of uploadLangs) {
      const parts = [];
      if (diff.added.size > 0) parts.push(`${diff.added.size} added`);
      if (diff.changed.size > 0) parts.push(`${diff.changed.size} changed`);
      if (diff.removed.size > 0) parts.push(`${diff.removed.size} removed`);
      uploadHtml += `<h3>${escapeHtml(lang)} &mdash; ${escapeHtml(parts.join(', '))}</h3>\n`;
      uploadHtml += renderDiffTable(diff) + '\n';
    }
  } else {
    uploadHtml = '<p>No changes to upload.</p>';
  }

  let downloadHtml = '';
  if (downloadLangs.length > 0) {
    for (const {lang, diff} of downloadLangs) {
      const parts = [];
      if (diff.added.size > 0) parts.push(`${diff.added.size} added`);
      if (diff.changed.size > 0) parts.push(`${diff.changed.size} changed`);
      if (diff.removed.size > 0) parts.push(`${diff.removed.size} removed`);
      downloadHtml += `<h3>${escapeHtml(lang)} &mdash; ${escapeHtml(parts.join(', '))}</h3>\n`;
      downloadHtml += renderDiffTable(diff) + '\n';
    }
  } else {
    downloadHtml = '<p>No changes to download.</p>';
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>POEditor Merge Report</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 2em; color: #222; }
  h1 { margin-bottom: 0.2em; }
  .meta { color: #666; margin-bottom: 1.5em; }
  .summary { background: #f0f4f8; border: 1px solid #ccd; border-radius: 6px; padding: 1em 1.5em; margin-bottom: 2em; }
  .summary strong { font-size: 1.1em; }
  h2 { border-bottom: 2px solid #ccc; padding-bottom: 0.3em; margin-top: 2em; }
  h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; }
  tr.added { background: #c6f0c6; }
  tr.changed { background: #f0e0a0; }
  tr.removed { background: #f0c0c0; }
  td:first-child { white-space: nowrap; font-family: monospace; font-size: 0.9em; }
  td:nth-child(2), td:nth-child(3) { word-break: break-word; }
  .legend { font-size: 0.9em; color: #444; }
  .swatch { display: inline-block; width: 1em; height: 1em; vertical-align: middle; border: 1px solid #ccc; margin: 0 0.2em 0 0.8em; }
  .added-swatch { background: #a6f0a6; }
  .changed-swatch { background: #f0d870; }
  .removed-swatch { background: #f0a0a0; }
</style>
</head>
<body>
<h1>POEditor Merge Report</h1>
<p class="meta">${escapeHtml(date)} &bull; Project ${escapeHtml(String(PROJECT_ID))} &bull; ${escapeHtml(mode)}</p>
<div class="summary">
  <strong>Upload to POEditor:</strong> ${uploadCount} change${uploadCount !== 1 ? 's' : ''} across ${uploadLangs.length} language${uploadLangs.length !== 1 ? 's' : ''}<br>
  <strong>Download from POEditor:</strong> ${downloadCount} change${downloadCount !== 1 ? 's' : ''} across ${downloadLangs.length} language${downloadLangs.length !== 1 ? 's' : ''}
</div>
<p class="legend"><span class="swatch added-swatch"></span> Added <span class="swatch changed-swatch"></span> Changed <span class="swatch removed-swatch"></span> Removed</p>
<h2>Upload to POEditor</h2>
${uploadHtml}
<h2>Download from POEditor</h2>
${downloadHtml}
</body>
</html>`;

  const reportPath = path.join(reportDir, 'merge-report.html');
  writeFileSync(reportPath, html);

  return {
    path: reportPath,
    uploadCount,
    uploadLangs: uploadLangs.length,
    downloadCount,
    downloadLangs: downloadLangs.length,
  };
}

// --- Main ---

async function main() {
  console.log(
    `=== POEditor Bidirectional Merge${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`,
  );

  // -------------------------------------------------------
  // Read baseline tag from sync-tag file
  // -------------------------------------------------------
  verbose(`Reading baseline tag from ${SYNC_TAG_FILE}...`);
  let baselineTag;
  try {
    baselineTag = readFileSync(SYNC_TAG_FILE, 'utf-8').trim();
  } catch {
    console.error(
      `${SYNC_TAG_FILE} not found.\n` +
        'Create it with the tag name of the last sync:\n' +
        `  echo "translations/<tag>" > ${SYNC_TAG_FILE}`,
    );
    process.exit(1);
  }
  if (!baselineTag) {
    console.error(`${SYNC_TAG_FILE} is empty. It should contain a tag name.`);
    process.exit(1);
  }

  // Verify the tag exists in git
  try {
    const tagRef = execSync(`git rev-parse ${baselineTag}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    verbose(`Baseline tag ${baselineTag} -> ${tagRef}`);
  } catch {
    console.error(
      `Tag ${baselineTag} (from ${SYNC_TAG_FILE}) not found in git.\n` +
        'Make sure the tag exists:\n' +
        `  git tag ${baselineTag} <commit>`,
    );
    process.exit(1);
  }

  // -------------------------------------------------------
  // Pre-flight: require clean working tree for files we modify
  // -------------------------------------------------------
  if (!DRY_RUN) {
    verbose('Checking for uncommitted changes...');
    const dirtyCheck = ['locales/po/', 'src/translations/', PO_SAVE_DIR, SYNC_TAG_FILE]
      .map(dir => `"${dir}"`)
      .join(' ');
    let dirtyFiles = '';
    try {
      // --porcelain shows both staged and unstaged changes + untracked files
      dirtyFiles = execSync(`git status --porcelain -- ${dirtyCheck}`, {
        encoding: 'utf-8',
      }).trim();
    } catch {
      // git command failed — be safe and refuse
      dirtyFiles = 'unknown';
    }
    if (dirtyFiles) {
      console.error(
        'Uncommitted changes detected in files the merge script modifies:\n',
      );
      console.error(dirtyFiles);
      console.error(
        '\nPlease commit or stash these changes before running the merge.',
      );
      console.error(
        'This ensures you can restore files after a --no-commit test run with:',
      );
      console.error(
        '  git checkout -- locales/po/ src/translations/ locales/po-save/ locales/sync-tag',
      );
      process.exit(1);
    }
    verbose('Working tree is clean.');
  }

  // -------------------------------------------------------
  // Phase 0: Detect conflicts
  // -------------------------------------------------------
  console.log('Phase 0: Detecting conflicts...\n');

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'poeditor-merge-'));
  verbose(`Temp directory: ${tmpDir}`);

  // Store per-language data for later phases
  const langData = {};
  let hasConflicts = false;

  for (const lang of LANGUAGES) {
    process.stdout.write(`  ${lang}: `);

    // Get all three versions of the PO
    verbose(`Converting src/translations/${lang}.json to PO...`);
    const localPo = await jsonToPo(`src/translations/${lang}.json`, lang);
    verbose(`  ${lang} local PO: ${localPo.length} bytes`);
    const taggedPo = getTaggedPo(lang, baselineTag);
    if (!taggedPo) {
      console.log(`SKIP (no PO at tag for ${lang})`);
      continue;
    }
    const poeditorPo = await downloadPoFromPoeditor(lang);

    // Parse all three
    const localMap = parsePo(localPo);
    const taggedMap = parsePo(taggedPo);
    const poeditorMap = parsePo(poeditorPo);
    verbose(
      `  ${lang} entries — local: ${localMap.size}, tagged: ${taggedMap.size}, POEditor: ${poeditorMap.size}`,
    );

    // Compute diffs
    const localDiff = diffMaps(localMap, taggedMap);
    const poeditorDiff = diffMaps(poeditorMap, taggedMap);

    // Find conflicts: changed on both sides to different values
    const conflicts = new Map();
    const convergent = new Map();

    for (const [msgid, localChange] of localDiff.changed) {
      if (poeditorDiff.changed.has(msgid)) {
        const poeditorChange = poeditorDiff.changed.get(msgid);
        if (localChange.new !== poeditorChange.new) {
          conflicts.set(msgid, {
            local: localChange.new,
            poeditor: poeditorChange.new,
          });
        } else {
          convergent.set(msgid, localChange.new);
        }
      }
    }

    // Also check: locally added but also added in POEditor with different value
    for (const [msgid, localValue] of localDiff.added) {
      if (poeditorDiff.added.has(msgid)) {
        const poeditorValue = poeditorDiff.added.get(msgid);
        if (localValue !== poeditorValue) {
          conflicts.set(msgid, {local: localValue, poeditor: poeditorValue});
        } else {
          convergent.set(msgid, localValue);
        }
      }
    }

    // Print summary
    const parts = [];
    if (diffSize(localDiff) > 0) {
      const lParts = [];
      if (localDiff.added.size > 0)
        lParts.push(`${localDiff.added.size} added`);
      if (localDiff.removed.size > 0)
        lParts.push(`${localDiff.removed.size} removed`);
      if (localDiff.changed.size > 0)
        lParts.push(`${localDiff.changed.size} changed`);
      parts.push(`local: ${lParts.join(', ')}`);
    }
    if (diffSize(poeditorDiff) > 0) {
      const pParts = [];
      if (poeditorDiff.added.size > 0)
        pParts.push(`${poeditorDiff.added.size} added`);
      if (poeditorDiff.removed.size > 0)
        pParts.push(`${poeditorDiff.removed.size} removed`);
      if (poeditorDiff.changed.size > 0)
        pParts.push(`${poeditorDiff.changed.size} changed`);
      parts.push(`POEditor: ${pParts.join(', ')}`);
    }
    if (conflicts.size > 0) parts.push(`CONFLICTS: ${conflicts.size}`);
    if (convergent.size > 0) parts.push(`convergent: ${convergent.size}`);
    if (parts.length === 0) parts.push('no changes');
    console.log(parts.join(' | '));

    if (conflicts.size > 0) {
      hasConflicts = true;
      for (const [msgid, {local, poeditor}] of conflicts) {
        const key = msgid.replace(/##/g, '.');
        console.log(`    CONFLICT "${key}":`);
        console.log(`      local:    "${local}"`);
        console.log(`      POEditor: "${poeditor}"`);
      }
    }

    langData[lang] = {localPo, taggedMap, localDiff, poeditorDiff, conflicts};

    // Save POEditor PO before any uploads (safety backup)
    if (!DRY_RUN && diffSize(localDiff) > 0) {
      if (!existsSync(PO_SAVE_DIR)) {
        mkdirSync(PO_SAVE_DIR, {recursive: true});
      }
      const poSavePath = path.join(PO_SAVE_DIR, `${lang}.po`);
      writeFileSync(poSavePath, poeditorPo);
      verbose(`Saved POEditor state to ${poSavePath}`);
    }

    console.log('');
  }

  if (hasConflicts) {
    console.error('Conflicts detected. Resolve them before merging.');
    console.error(
      'Fix the local JSON files or POEditor translations so they agree, then re-run.',
    );
    rmSync(tmpDir, {recursive: true});
    process.exit(1);
  }

  // Check if there are any changes at all
  const hasAnyChanges = LANGUAGES.some(
    lang =>
      langData[lang] &&
      (diffSize(langData[lang].localDiff) > 0 ||
        diffSize(langData[lang].poeditorDiff) > 0),
  );

  if (!hasAnyChanges) {
    console.log('Already in sync. No changes needed.');
    rmSync(tmpDir, {recursive: true});
    return;
  }

  // -------------------------------------------------------
  // Generate change report (always, for all modes)
  // -------------------------------------------------------
  const report = generateChangeReport(langData, tmpDir);
  console.log(
    `  Upload: ${report.uploadCount} changes (${report.uploadLangs} langs) | Download: ${report.downloadCount} changes (${report.downloadLangs} langs)`,
  );

  if (DRY_RUN) {
    console.log(`\nDry run complete. No files were modified.`);
    console.log(`\nChanges summarized: ${report.path}`);
    execSync(`open ${report.path}`);
    return;
  }

  // -------------------------------------------------------
  // Phase 1: Upload English (if local English changes exist)
  // -------------------------------------------------------
  const enData = langData.en;
  if (enData && diffSize(enData.localDiff) > 0) {
    console.log('Phase 1: Uploading English to POEditor...\n');
    const enPoPath = path.join(tmpDir, 'en.po');
    writeFileSync(enPoPath, enData.localPo);
    verbose(`Wrote ${enPoPath} (${enData.localPo.length} bytes)`);
    runScript(
      'poeditor-upload.mjs',
      `--sync-terms --fuzzy-trigger ${enPoPath}`,
    );
    console.log('');
  } else {
    console.log('Phase 1: No local English changes. Skipping upload.\n');
  }

  // -------------------------------------------------------
  // Phase 2: Upload other languages (if local changes exist)
  // -------------------------------------------------------
  const nonEnWithChanges = LANGUAGES.filter(
    lang =>
      lang !== 'en' && langData[lang] && diffSize(langData[lang].localDiff) > 0,
  );

  if (nonEnWithChanges.length > 0) {
    console.log('Phase 2: Uploading non-English local changes...\n');

    // Need to wait after Phase 1 upload if it happened
    if (enData && diffSize(enData.localDiff) > 0) {
      console.log(`  (waiting ${UPLOAD_DELAY_MS / 1000}s for rate limit...)`);
      await new Promise(r => setTimeout(r, UPLOAD_DELAY_MS));
    }

    for (let i = 0; i < nonEnWithChanges.length; i++) {
      if (i > 0) {
        console.log(`  (waiting ${UPLOAD_DELAY_MS / 1000}s for rate limit...)`);
        await new Promise(r => setTimeout(r, UPLOAD_DELAY_MS));
      }
      const lang = nonEnWithChanges[i];
      const diff = langData[lang].localDiff;

      // Build partial PO with only changed/added entries, skipping TK placeholders
      const entries = new Map();
      let skippedTk = 0;
      for (const [msgid, msgstr] of diff.added) {
        if (msgstr.startsWith('TK ')) {
          skippedTk++;
        } else {
          entries.set(msgid, msgstr);
        }
      }
      for (const [msgid, {new: newValue}] of diff.changed) {
        if (newValue.startsWith('TK ')) {
          skippedTk++;
        } else {
          entries.set(msgid, newValue);
        }
      }
      if (skippedTk > 0) {
        console.log(`  ${lang}: skipped ${skippedTk} TK placeholder(s)`);
      }

      if (entries.size === 0) {
        verbose(
          `  ${lang}: all entries were TK placeholders, nothing to upload`,
        );
        continue;
      }
      const partialPo = buildPartialPo(entries, {fuzzy: true});
      const partialPoPath = path.join(tmpDir, `${lang}.po`);
      writeFileSync(partialPoPath, partialPo);
      verbose(
        `Wrote ${partialPoPath} (${entries.size} entries, ${partialPo.length} bytes)`,
      );
      runScript('poeditor-upload.mjs', partialPoPath);
    }
    console.log('');
  } else {
    console.log('Phase 2: No local non-English changes. Skipping upload.\n');
  }

  // -------------------------------------------------------
  // Phase 3: Download, convert, commit, tag
  // -------------------------------------------------------
  console.log('Phase 3: Downloading merged translations...\n');

  // 1. Regenerate en.po from en.json
  runNpmScript('localization-to-po');

  // 2. Download PO files from POEditor
  // --force skips the download script's uncommitted-changes check (merge has its own pre-flight)
  // If POEditor has English changes, download en.po too (overwrites locally-generated one)
  const hasPoeditorEnglishChanges =
    langData['en'] && diffSize(langData['en'].poeditorDiff) > 0;
  if (hasPoeditorEnglishChanges) {
    verbose(
      'Downloading en.po from POEditor (POEditor-side English changes detected)',
    );
    runScript('poeditor-download.mjs', '--force en');
  }
  // Download non-English PO files
  runScript('poeditor-download.mjs', '--force');

  // 3. Regenerate JSON from PO
  runNpmScript('localization-to-json');

  console.log('');

  // 4. Check for actual changes
  let changedFiles;
  try {
    changedFiles = execSync(
      'git diff --name-only locales/po/ src/translations/',
      {encoding: 'utf-8'},
    ).trim();
  } catch {
    changedFiles = '';
  }

  verbose(`Changed files:\n${changedFiles || '(none)'}`);

  if (!changedFiles) {
    console.log('Already in sync. No files differ after download.');
    rmSync(tmpDir, {recursive: true});
    return;
  }

  // 5. Stage only files with actual translation changes (not just metadata)
  // git diff returns repo-relative paths (dev-client/...), strip prefix for filesystem access
  const repoPrefix = 'dev-client/';
  const filesToStage = [];
  for (const file of changedFiles.split('\n')) {
    if (!file) continue;
    const localPath = file.startsWith(repoPrefix)
      ? file.slice(repoPrefix.length)
      : file;
    if (file.endsWith('.po')) {
      // Compare msgid/msgstr content, ignore header differences
      try {
        const currentContent = readFileSync(localPath);
        const oldContent = execSync(`git show HEAD:${repoPrefix}${localPath}`, {
          encoding: 'buffer',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const currentMap = parsePo(currentContent);
        const oldMap = parsePo(oldContent);
        const diff = diffMaps(currentMap, oldMap);
        if (diffSize(diff) > 0) {
          verbose(
            `  ${localPath}: ${diff.added.size} added, ${diff.removed.size} removed, ${diff.changed.size} changed -> stage`,
          );
          filesToStage.push(localPath);
        } else {
          console.log(
            `  Restoring ${localPath} (metadata-only changes, no translation differences)`,
          );
          execSync(`git checkout -- ${localPath}`, {stdio: 'inherit'});
        }
      } catch {
        // New file or can't read old version — stage it
        verbose(`  ${localPath}: new or unreadable -> stage`);
        filesToStage.push(localPath);
      }
    } else {
      // JSON files — always stage if git reports a diff
      verbose(`  ${localPath}: json changed -> stage`);
      filesToStage.push(localPath);
    }
  }

  // Check for po-save files to stage
  const hasPoSaveFiles =
    existsSync(PO_SAVE_DIR) &&
    readdirSync(PO_SAVE_DIR).some(f => f.endsWith('.po'));

  if (filesToStage.length === 0 && !hasPoSaveFiles) {
    console.log(
      'Only metadata changes detected (timestamps, headers). No commit needed.',
    );
    // Restore PO files to avoid noisy uncommitted changes
    execSync('git checkout -- locales/po/', {stdio: 'inherit'});
    rmSync(tmpDir, {recursive: true});
    return;
  }

  // 6. Build commit message with change details
  const commitLines = ['chore: sync translations with POEditor', ''];

  for (const lang of LANGUAGES) {
    if (!langData[lang]) continue;
    const localDiff = langData[lang].localDiff;
    const poeditorDiff = langData[lang].poeditorDiff;
    if (diffSize(localDiff) === 0 && diffSize(poeditorDiff) === 0) continue;

    const summaryParts = [];
    const totalAdded = new Set([
      ...localDiff.added.keys(),
      ...poeditorDiff.added.keys(),
    ]).size;
    const totalRemoved = new Set([
      ...localDiff.removed,
      ...poeditorDiff.removed,
    ]).size;
    const totalChanged = new Set([
      ...localDiff.changed.keys(),
      ...poeditorDiff.changed.keys(),
    ]).size;
    if (totalAdded > 0) summaryParts.push(`${totalAdded} added`);
    if (totalRemoved > 0) summaryParts.push(`${totalRemoved} removed`);
    if (totalChanged > 0) summaryParts.push(`${totalChanged} changed`);
    commitLines.push(`${lang}: ${summaryParts.join(', ')}`);

    // Show details (combine local + POEditor changes)
    // Truncate lines to stay under commitlint body-max-line-length (100)
    const MAX_LINE = 100;
    const truncLine = line => {
      // Replace newlines so multiline strings don't create extra body lines
      const flat = line.replace(/\n/g, '↵');
      return flat.length > MAX_LINE ? flat.slice(0, MAX_LINE - 1) + '…' : flat;
    };
    let detailCount = 0;
    const MAX_DETAILS = 50;

    // Added entries
    const allAdded = new Map([...localDiff.added, ...poeditorDiff.added]);
    for (const [, value] of allAdded) {
      if (detailCount >= MAX_DETAILS) break;
      commitLines.push(truncLine(`  + "${value}"`));
      detailCount++;
    }

    // Changed entries
    const allChanged = new Map([...localDiff.changed, ...poeditorDiff.changed]);
    for (const [, {old: oldVal, new: newVal}] of allChanged) {
      if (detailCount >= MAX_DETAILS) break;
      commitLines.push(truncLine(`  "${oldVal}" → "${newVal}"`));
      detailCount++;
    }

    // Removed entries
    const allRemoved = new Set([...localDiff.removed, ...poeditorDiff.removed]);
    for (const msgid of allRemoved) {
      if (detailCount >= MAX_DETAILS) break;
      commitLines.push(truncLine(`  - "${msgid}"`));
      detailCount++;
    }

    const totalDetails = allAdded.size + allChanged.size + allRemoved.size;
    if (detailCount < totalDetails) {
      commitLines.push(`  ... and ${totalDetails - detailCount} more`);
    }
  }

  const commitMessage = commitLines.join('\n');

  if (NO_COMMIT) {
    // Skip commit/tag — just report what changed
    console.log('Skipping commit and tag (--no-commit).\n');
    console.log('Modified files:');
    for (const file of filesToStage) {
      console.log(`  ${file}`);
    }
    if (hasPoSaveFiles) {
      const poSaveFiles = readdirSync(PO_SAVE_DIR).filter(f =>
        f.endsWith('.po'),
      );
      for (const f of poSaveFiles) {
        console.log(`  ${PO_SAVE_DIR}/${f} (new)`);
      }
    }
    console.log('\nTo restore all files to their pre-merge state:');
    console.log(
      '  git checkout -- locales/po/ src/translations/ locales/po-save/ locales/sync-tag',
    );
    console.log(`\nChanges summarized: ${report.path}`);
    execSync(`open ${report.path}`);
    return;
  }

  // 7. Create timestamped tag name and update sync-tag file
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  const tagName = `translations/${timestamp}`;
  writeFileSync(SYNC_TAG_FILE, tagName + '\n');
  verbose(`Updated ${SYNC_TAG_FILE} -> ${tagName}`);

  // Stage files
  if (filesToStage.length > 0) {
    verbose(`Staging ${filesToStage.length} files: ${filesToStage.join(', ')}`);
    execSync(`git add ${filesToStage.join(' ')}`, {stdio: 'inherit'});
  }
  if (hasPoSaveFiles) {
    verbose(`Staging po-save files from ${PO_SAVE_DIR}/`);
    execSync(`git add ${PO_SAVE_DIR}/`, {stdio: 'inherit'});
  }
  execSync(`git add ${SYNC_TAG_FILE}`, {stdio: 'inherit'});

  // Commit
  console.log('Committing...\n');
  verbose(`Commit message:\n${commitMessage}`);
  const escapedMessage = commitMessage.replace(/'/g, "'\\''");
  execSync(`git commit -m '${escapedMessage}'`, {stdio: 'inherit'});

  // Create the tag (after commit, so it points to the sync commit)
  execSync(`git tag ${tagName}`, {stdio: 'inherit'});
  console.log(`\n  Created tag: ${tagName}`);

  console.log('\nDone! Merge complete.');
  console.log('Remember to push the commit and tag when ready:');
  console.log(`  git push && git push origin ${tagName}`);
  console.log(`\nChanges summarized: open ${report.path}`);
  execSync(`open ${report.path}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
