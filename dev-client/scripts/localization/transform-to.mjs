/*
 * Copyright © 2021-2024 Technology Matters
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

import {existsSync, readFileSync} from 'fs';
import {writeFile} from 'fs/promises';
import path from 'path';

import {filesInFolder} from './utils.mjs';
import {gettextToI18next, i18nextToPo} from 'i18next-conv';

// Script arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Parameters [po|json]');
  process.exit(1);
}

const transformTo = args[0];

// Util functions
const save = target => result => writeFile(target, result);

// Base transform function
const transform = (process, from, i18Transform) => {
  return filesInFolder(new URL(from, import.meta.url))
    .then(files =>
      files.filter(
        file =>
          file.toString().endsWith('.json') || file.toString().endsWith('.po'),
      ),
    )
    .then(files => {
      console.log(
        `${process} transform starting.`,
        'Files:',
        files.map(f => f.pathname),
      );
      return files;
    })
    .then(files =>
      files.map(filePath => {
        const locale = path.parse(filePath.pathname).name;
        return i18Transform(locale, filePath).then(() => locale);
      }),
    )
    .then(promises => Promise.all(promises))
    .then(locales =>
      console.log(
        `Finished ${process} transform successfully.`,
        'Locales:',
        locales,
      ),
    )
    .catch(error => console.error(`Error transforming to ${process}`, error));
};

/* i18next-conv treats the rock fragemnt volume labels (VOLUME_0_1, VOLUME_1_15,
 * VOLUME_15_35, VOLUME_35_60, VOLUME_60) as plurals, resulting in a msgctext
 * and one or two msgstr(s).
 *
 * To avoid this, we change the labels to VOLUME:0:1, VOLUME:1:15, etc. before
 * converting to .po.
 *
 * We reverse this conversion when going from .po to .json.
 */

// PO transform
const toPoOptions = {
  project: 'Terraso',
  ctxSeparator: '',
  compatibilityJSON: 'v4',
  foldLength: 0,
};
const toPo = () =>
  transform('PO', '../../src/translations/', (locale, filePath) =>
    i18nextToPo(locale, readFileSync(filePath), toPoOptions).then(
      save(`locales/po/${locale}.po`),
    ),
  );

// JSON transform
const toJsonOptions = {
  // Setting this to true will skip strings marked "fuzzy"
  skipUntranslated: false,
};

/**
 * Reorder a nested object to match the key order of a reference object.
 * Keys present in obj but not in ref are appended at the end.
 */
function reorder(obj, ref) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (typeof ref !== 'object' || ref === null) return obj;
  const result = {};
  // First, keys in ref order
  for (const key of Object.keys(ref)) {
    if (key in obj) {
      result[key] = reorder(obj[key], ref[key]);
    }
  }
  // Then, new keys not in ref
  for (const key of Object.keys(obj)) {
    if (!(key in ref)) {
      result[key] = obj[key];
    }
  }
  return result;
}

const toJson = () =>
  transform('JSON', '../../locales/po/', (locale, filePath) => {
    const targetPath = `src/translations/${locale}.json`;
    // Read existing key order before async conversion (so parallel writes don't interfere)
    const existingOrder = existsSync(targetPath)
      ? JSON.parse(readFileSync(targetPath, 'utf-8'))
      : null;
    return gettextToI18next(locale, readFileSync(filePath), toJsonOptions).then(
      jsonStr => {
        let parsed = JSON.parse(jsonStr);
        if (existingOrder) {
          parsed = reorder(parsed, existingOrder);
        }
        return writeFile(targetPath, JSON.stringify(parsed, null, 4) + '\n');
      },
    );
  });

// Scripts entry
if (transformTo === 'po') {
  toPo();
}
if (transformTo === 'json') {
  toJson();
}
