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

/*
 * Generates munsellTestData.json — a shared reference file of Munsell-to-LAB/hex
 * conversions produced by the `munsell` npm library (v1.x).
 *
 * The backend team can compare their Python/CSV-based conversion against this
 * file to verify both implementations agree.
 *
 * Run:  node scripts/generateMunsellTestData.js
 *   or: npm run generate-munsell-test-data
 */

const fs = require('fs');
const path = require('path');
const {mhvcToLab, mhvcToHex, mhvcToMunsell} = require('munsell');

const HUE_FAMILIES = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB'];
const HUE_FAMILY_BASE_INDICES = {
  R: 0,
  YR: 1,
  Y: 2,
  GY: 3,
  G: 4,
  BG: 5,
  B: 6,
  PB: 7,
};
const SUBSTEPS = [5, 10];
const VALUES = [3, 5, 7];
const CHROMAS = [2, 6];

const NEUTRAL_VALUES = [2.5, 4, 6, 8];

function hue100(family, substep) {
  return HUE_FAMILY_BASE_INDICES[family] * 10 + substep;
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function generateEntry(h, v, c) {
  const [L, A, B] = mhvcToLab(h, v, c);
  const hex = mhvcToHex(h, v, c);
  const munsell = mhvcToMunsell(h, v, c);

  return {
    munsell,
    hue100: h,
    value: v,
    chroma: c,
    lab: {L: round6(L), A: round6(A), B: round6(B)},
    hex,
  };
}

const entries = [];

for (const family of HUE_FAMILIES) {
  for (const substep of SUBSTEPS) {
    const h = hue100(family, substep);
    for (const v of VALUES) {
      for (const c of CHROMAS) {
        entries.push(generateEntry(h, v, c));
      }
    }
  }
}

for (const v of NEUTRAL_VALUES) {
  entries.push(generateEntry(0, v, 0));
}

const outPath = path.join(__dirname, '..', 'src', 'model', 'color', 'munsellTestData.json');
const output = {
  _comment:
    'Generated from terraso-mobile-client using the munsell npm library. ' +
    'To regenerate, run: npm run generate-munsell-test-data',
  entries,
};
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

console.log(`Wrote ${entries.length} entries to ${path.relative(process.cwd(), outPath)}`);
