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

import * as yup from 'yup';
import {FORM_LABEL_MAX} from 'terraso-mobile-client/constants';
import {DepthInterval} from 'terraso-client-shared/soilId/soilIdSlice';
import {TFunction} from 'i18next';

type Args = {
  t: TFunction;
  existingIntervals: DepthInterval[];
};

export const intervalSchema = ({t, existingIntervals}: Args) =>
  yup.object({
    label: yup
      .string()
      .max(
        FORM_LABEL_MAX,
        t('soil.depth_interval.label_help', {max: FORM_LABEL_MAX}),
      ),
    start: yup
      .number()
      .min(0)
      .required()
      .test((start, {createError}) => {
        if (
          existingIntervals.some(
            interval => start >= interval.start && start < interval.end,
          )
        ) {
          return createError({message: 'overlap'});
        }
        return true;
      }),
    end: yup
      .number()
      .max(200)
      .required()
      .test((end, {createError, parent}) => {
        if (
          existingIntervals.some(
            interval => end > interval.start && end <= interval.end,
          )
        ) {
          return createError({message: 'overlap'});
        } else if (parent.start >= end) {
          return createError({message: 'ordering'});
        }
        return true;
      }),
  });
