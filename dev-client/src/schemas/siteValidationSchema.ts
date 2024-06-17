/*
 * Copyright © 2023 Technology Matters
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

import {TFunction} from 'i18next';
import * as yup from 'yup';

import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  SITE_NAME_MAX_LENGTH,
  SITE_NAME_MIN_LENGTH,
} from 'terraso-mobile-client/constants';

export const siteValidationSchema = (t: TFunction) =>
  yup.object({
    name: yup
      .string()
      .trim()
      .min(
        SITE_NAME_MIN_LENGTH,
        t('site.form.name_min_length_error', {
          min: SITE_NAME_MIN_LENGTH,
        }),
      )
      .max(
        SITE_NAME_MAX_LENGTH,
        t('site.form.name_max_length_error', {
          max: SITE_NAME_MAX_LENGTH,
        }),
      )
      .required(t('general.required')),
    latitude: yup
      .number()
      .min(
        LATITUDE_MIN,
        t('site.form.min_latitude_error', {
          min: LATITUDE_MIN,
        }),
      )
      .max(
        LATITUDE_MAX,
        t('site.form.max_latitude_error', {
          max: LATITUDE_MAX,
        }),
      )
      .required(t('general.required')),
    longitude: yup
      .number()
      .min(
        LONGITUDE_MIN,
        t('site.form.min_longitude_error', {
          min: LONGITUDE_MIN,
        }),
      )
      .max(
        LONGITUDE_MAX,
        t('site.form.max_longitude_error', {
          max: LONGITUDE_MAX,
        }),
      )
      .required(t('general.required')),
    projectId: yup.string(),
    privacy: yup.string().oneOf(['PUBLIC', 'PRIVATE'] as const),
  });
