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
