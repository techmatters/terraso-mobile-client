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

// react-native-worklets 0.8+ (reanimated 4.x's peer) hard-asserts its
// native side is initialized on import. Recursive proxy stub so any imported
// name (createSerializable, serializableMappingCache.set, etc.) safely
// no-ops. See jest/integration/setup.ts for the same fix on the other side.
const mockWorkletsStub: any = new Proxy(function () {}, {
  get: (_target, prop) => (prop === 'then' ? undefined : mockWorkletsStub),
  apply: () => mockWorkletsStub,
});
jest.mock('react-native-worklets', () => mockWorkletsStub);

// expo-media-library@56 exports classes that extend a native module
// (`ExpoMediaLibraryNext`), which is undefined at import time in jest and
// throws "Super expression must either be null or a function". Any unit test
// whose require-chain reaches components/inputs/image/ImagePicker.tsx will
// pull expo-media-library in and blow up — stub the one API we use.
jest.mock('expo-media-library', () => ({
  createAssetAsync: jest.fn(() => Promise.resolve()),
}));
