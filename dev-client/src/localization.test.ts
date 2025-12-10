/*
 * Copyright © 2025 Technology Matters
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

import {getLocales} from 'expo-localization';

import {
  fallbackLanguage,
  getLanguage,
  SUPPORTED_LANGUAGES,
} from 'terraso-mobile-client/localization';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

jest.mock('expo-localization');
jest.mock('terraso-mobile-client/persistence/kvStorage');

const mockGetLocales = getLocales as jest.MockedFunction<typeof getLocales>;
const mockKvStorage = kvStorage as jest.Mocked<typeof kvStorage>;

describe('getLanguage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when language is set in KV storage', () => {
    it('should return stored language when it is supported', () => {
      mockKvStorage.getString.mockReturnValue('uk');
      mockGetLocales.mockReturnValue([
        {languageCode: 'en', languageTag: 'en-US'},
      ] as any);

      const result = getLanguage();

      expect(result).toBe('uk');
      expect(mockKvStorage.getString).toHaveBeenCalledWith(
        'user-selected-language',
      );
    });

    // Will need to update tests if app begins supporting Chinese
    it('should return device language when stored language is not supported', () => {
      mockKvStorage.getString.mockReturnValue('zh');
      mockGetLocales.mockReturnValue([
        {languageCode: 'uk', languageTag: 'uk-UA'},
      ] as any);

      const result = getLanguage();

      expect(result).toBe('uk');
    });

    it('should return fallback language when stored language and device language are not supported', () => {
      mockKvStorage.getString.mockReturnValue('zh');
      mockGetLocales.mockReturnValue([
        {languageCode: 'zh', languageTag: 'zh-TW'},
      ] as any);

      const result = getLanguage();

      expect(result).toBe(fallbackLanguage);
    });
  });

  describe('when language is not set in KV storage', () => {
    it('should return device language when it is supported', () => {
      mockKvStorage.getString.mockReturnValue(undefined);
      mockGetLocales.mockReturnValue([
        {languageCode: 'es', languageTag: 'es-ES'},
      ] as any);

      const result = getLanguage();

      expect(result).toBe('es');
    });

    it('should return fallback language when device language is not supported', () => {
      mockKvStorage.getString.mockReturnValue(undefined);
      mockGetLocales.mockReturnValue([
        {languageCode: 'zh', languageTag: 'zh-TW'},
      ] as any);

      const result = getLanguage();

      expect(result).toBe(fallbackLanguage);
    });

    it('should return fallback language when getLocales returns empty array', () => {
      mockKvStorage.getString.mockReturnValue(undefined);
      mockGetLocales.mockReturnValue([]);

      const result = getLanguage();

      expect(result).toBe(fallbackLanguage);
    });

    it('should verify all supported languages are correctly identified', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        mockKvStorage.getString.mockReturnValue(lang);
        mockGetLocales.mockReturnValue([
          {languageCode: 'fr', languageTag: 'fr-FR'},
        ] as any);

        const result = getLanguage();

        expect(result).toBe(lang);
      });
    });
  });
});
