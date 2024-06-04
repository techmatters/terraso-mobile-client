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
  CoordsParseError,
  parseCoords,
} from 'terraso-mobile-client/components/StaticMapView';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  SITE_NAME_MAX,
  SITE_NAME_MIN,
} from 'terraso-mobile-client/constants';

export const siteValidationSchema = (t: TFunction) =>
  yup.object({
    name: yup
      .string()
      .trim()
      .min(
        SITE_NAME_MIN,
        t('site.form.name_min_length_error', {
          min: SITE_NAME_MIN,
        }),
      )
      .max(
        SITE_NAME_MAX,
        t('site.form.name_max_length_error', {
          max: SITE_NAME_MAX,
        }),
      )
      .required(t('general.required')),
    coords: yup
      .string()
      .required(t('site.form.coords_parse_error.COORDS_PARSE'))
      .test((coords, {createError}) => {
        try {
          parseCoords(coords);
        } catch (e) {
          if (e instanceof CoordsParseError) {
            return createError({
              message: t(`site.form.coords_parse_error.${e.message}`, {
                LATITUDE_MIN,
                LATITUDE_MAX,
                LONGITUDE_MIN,
                LONGITUDE_MAX,
              }),
            });
          }
          throw e;
        }
        return true;
      }),
    projectId: yup.string(),
    privacy: yup.string().oneOf(['PUBLIC', 'PRIVATE'] as const),
  });
