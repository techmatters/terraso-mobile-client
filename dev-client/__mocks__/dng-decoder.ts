/*
 * Copyright © 2026 Technology Matters
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

// Manual mock for the `dng-decoder` Nitro module. The real module pulls in
// react-native-nitro-modules (native + ESM) which Jest can't load, and several
// pure modules import it transitively (e.g. colorDetection ← ImagePicker). Tests
// that actually exercise DNG decoding should override individual methods with
// jest.spyOn / mockReturnValue.
export const DngDecoderHybrid = {
  readMetadata: jest.fn(() => ({
    width: 4032,
    height: 3024,
    bitsPerSample: 14,
    cfaPattern: 'RGGB',
    blackLevel: 0,
    whiteLevel: 16383,
    isMonochrome: false,
  })),
  decodeDngRois: jest.fn(() => []),
  decodeDngRoisReduced: jest.fn(() => []),
  renderPreview: jest.fn(() => ({
    uri: 'file:///mock-preview.png',
    width: 100,
    height: 100,
  })),
  readPreviewGrayscale: jest.fn(() => ({
    width: 48,
    height: 64,
    pixels: new ArrayBuffer(48 * 64),
    sourceWidth: 3024,
    sourceHeight: 4032,
  })),
  readPreviewRgb: jest.fn(),
  readPreviewRgbPhoto: jest.fn(),
  decodePhotoRois: jest.fn(() => []),
  extractDngPreviewJpeg: jest.fn(() => '/mock-preview.jpg'),
};
