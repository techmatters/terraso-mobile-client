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

import {i18n as i18nType, TFunction} from 'i18next';

import {SoilSeries} from 'terraso-client-shared/graphqlSchema/graphql';

import {
  getGlobalSoilSeriesDisplayText,
  getSoilDisplayNameText,
} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/globalSoilI18nFunctions';

// There may be some better way to mock the react-i18next objects?
const flatTranslations: Record<string, string> = {
  'soil.match_info.haplic_acrisols.name':
    'Name for Haplic Acrisols (translated)',
  'soil.match_info.haplic_acrisols.description':
    'Description for Haplic Acrisols (translated)',
  'soil.match_info.haplic_acrisols.management':
    'Management for Haplic Acrisols (translated)',
};
const mockT = ((key: string) => flatTranslations[key] ?? key) as TFunction;
const mockI18n = {
  exists: (key: string) =>
    Object.keys(flatTranslations).some(
      k => k === key || k.startsWith(`${key}.`),
    ),
} as i18nType;

describe('getSoilDisplayNameText', () => {
  test('returns the translated name if global and exists', () => {
    expect(
      getSoilDisplayNameText('Haplic Acrisols', 'GLOBAL', mockT, mockI18n),
    ).toEqual('Name for Haplic Acrisols (translated)');
  });
  test('returns the given name if US', () => {
    expect(
      getSoilDisplayNameText('Haplic Acrisols', 'US', mockT, mockI18n),
    ).toEqual('Haplic Acrisols');
  });
  test('returns the given name if dataRegion unknown', () => {
    expect(
      getSoilDisplayNameText('Haplic Acrisols', undefined, mockT, mockI18n),
    ).toEqual('Haplic Acrisols');
  });
  test('returns the given name if it doesnt exist in i18n', () => {
    expect(
      getSoilDisplayNameText(
        'Soil that does not have translation',
        'GLOBAL',
        mockT,
        mockI18n,
      ),
    ).toEqual('Soil that does not have translation');
  });
});

describe('getGlobalSoilSeriesDisplayText', () => {
  test('returns soilSeries with translations when possible', () => {
    const soilSeries: SoilSeries = {name: 'Haplic Acrisols'};

    const result = getGlobalSoilSeriesDisplayText(soilSeries, mockT, mockI18n);
    expect(result.name).toEqual('Name for Haplic Acrisols (translated)');
    expect(result.description).toEqual(
      'Description for Haplic Acrisols (translated)',
    );
    expect(result.management).toEqual(
      'Management for Haplic Acrisols (translated)',
    );
  });

  test('returns soilSeries with given strings for soils without translation', () => {
    const soilSeries: SoilSeries = {
      name: 'Soil with no translation',
      description: 'Description for soil with no translation',
    };

    const result = getGlobalSoilSeriesDisplayText(soilSeries, mockT, mockI18n);
    expect(result.name).toEqual('Soil with no translation');
    expect(result.description).toEqual(
      'Description for soil with no translation',
    );
    expect(result.management).toEqual(undefined);
  });
});
