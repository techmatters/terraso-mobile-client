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
  displayName: 'integration',
  testMatch: ['**/__tests__/**/*[.-]test.[jt]s?(x)'],
  preset: 'jest-expo',
  resolver: '<rootDir>/jest/resolver.js',
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/@rnmapbox/maps/setup-jest.js',
    '<rootDir>/jest/integration/setup.ts',
  ],
  transformIgnorePatterns: [
    // nitro-core ships ESM-only (an `import` in its entry) and is a
    // transitive dep of react-native-nitro-modules (which IS covered by
    // `react-native-.*` below). CI's Node 22 runs Jest without
    // require(ESM), so without this the integration launch test dies on
    // the first require chain into any Nitro-backed module (dng-decoder,
    // frame-analyzer, raw-camera-android).
    'node_modules/(?!(.*/)?(@?react-native|react-native-.*|nitro-core|@react-navigation|@react-aria|uuid|immer|expo.*|@expo.*|@rnmapbox|@sentry|@gorhom|react-redux|@reduxjs|native-base|lottie-react-native|terraso-client-shared))',
  ],
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.ts',
    '^@testing/(.*)': '<rootDir>/jest/$1',
    '^terraso-mobile-client/(.*)': '<rootDir>/src/$1',
  },
};
