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

module.exports = {
  displayName: 'snapshot',
  testMatch: ['**/__tests__/**/*[.-]test.[jt]s?(x)'],
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '@rnmapbox/maps/setup-jest',
    './node_modules/react-native-mmkv-storage/jest/mmkvJestSetup.js',
    '<rootDir>/jest/snapshot/setup.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-cookies|uuid|react-native-mmkv-storage|react-native-autocomplete-input|expo(nent)?|@expo(nent)?/.*)|expo-constants|@rnmapbox/)',
  ],
};
