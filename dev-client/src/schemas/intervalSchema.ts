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

import {DepthInterval} from 'terraso-client-shared/soilId/soilIdSlice';

import {DEPTH_INTERVAL_LABEL_MAX_LENGTH} from 'terraso-mobile-client/constants';

type Args = {
  t: TFunction;
  existingIntervals: {depthInterval: DepthInterval}[];
};

export const intervalSchema = ({t, existingIntervals}: Args) =>
  yup.object({
    label: yup.string().max(
      DEPTH_INTERVAL_LABEL_MAX_LENGTH,
      t('soil.depth_interval.label_help', {
        max: DEPTH_INTERVAL_LABEL_MAX_LENGTH,
      }),
    ),
    start: yup
      .number()
      .integer()
      .min(0)
      .max(200)
      .required(t('general.required'))
      .test((start, {createError}) => {
        if (
          existingIntervals.some(
            ({depthInterval}) =>
              start >= depthInterval.start && start < depthInterval.end,
          )
        ) {
          return createError({
            message: t('soil.depth_interval.error.overlaps'),
          });
        }
        return true;
      }),
    end: yup
      .number()
      .integer()
      .min(0)
      .max(200)
      .required(t('general.required'))
      .test((end, {createError, parent}) => {
        if (
          existingIntervals.some(
            ({depthInterval}) =>
              end > depthInterval.start && end <= depthInterval.end,
          )
        ) {
          return createError({
            message: t('soil.depth_interval.error.overlaps'),
          });
        } else if (parent.start >= end) {
          return createError({
            message: t('soil.depth_interval.error.ordering'),
          });
        }
        return true;
      }),
  });
