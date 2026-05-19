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

import {siteValidationSchema} from 'terraso-mobile-client/schemas/siteValidationSchema';

/* These tests pin the string-in-form / number-on-submit contract: the form
 * holds lat/lon as strings (so FormTextField can drive them), but yup coerces
 * to numbers at validate() / cast() time for downstream consumers. */

/* Stub t() so error keys round-trip as identifiers we can assert on. */
const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as any;

const schema = siteValidationSchema(t);

const valid = {
  name: 'My site',
  latitude: '48.5',
  longitude: '-122.3',
  projectId: undefined,
  privacy: 'PUBLIC' as const,
};

describe('siteValidationSchema', () => {
  describe('cast()', () => {
    test('coerces string latitude / longitude to numbers', () => {
      const result = schema.cast(valid);
      expect(result.latitude).toBe(48.5);
      expect(result.longitude).toBe(-122.3);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });
  });

  describe('latitude', () => {
    test('accepts a numeric string in range', async () => {
      await expect(schema.validate(valid)).resolves.toBeTruthy();
    });

    test('typeError fires for non-numeric input', async () => {
      await expect(
        schema.validate({...valid, latitude: 'abc'}),
      ).rejects.toThrow(/number_error/);
    });

    test('out-of-range value triggers max_latitude_error', async () => {
      await expect(
        schema.validate({...valid, latitude: '200'}),
      ).rejects.toThrow(/max_latitude_error/);
    });

    test('out-of-range value triggers min_latitude_error', async () => {
      await expect(
        schema.validate({...valid, latitude: '-200'}),
      ).rejects.toThrow(/min_latitude_error/);
    });

    test('empty value triggers general.required', async () => {
      await expect(schema.validate({...valid, latitude: ''})).rejects.toThrow(
        /general\.required|number_error/,
      );
    });

    /* Documents the locale gap: a French/German user typing "48,5" gets
     * rejected because yup's `.number()` only understands `.` as decimal
     * separator. If we ever add locale-aware parsing, flip this to resolve. */
    test('comma-decimal input is rejected (locale gap, intentional today)', async () => {
      await expect(
        schema.validate({...valid, latitude: '48,5'}),
      ).rejects.toThrow();
    });
  });

  describe('longitude', () => {
    test('typeError fires for non-numeric input', async () => {
      await expect(
        schema.validate({...valid, longitude: 'abc'}),
      ).rejects.toThrow(/number_error/);
    });

    test('out-of-range value triggers max_longitude_error', async () => {
      await expect(
        schema.validate({...valid, longitude: '999'}),
      ).rejects.toThrow(/max_longitude_error/);
    });
  });
});
