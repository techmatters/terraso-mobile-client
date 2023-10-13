import * as yup from 'yup';
import {FORM_LABEL_MAX} from '../../constants';
import {DepthInterval} from 'terraso-client-shared/soilId/soilIdSlice';
import {TFunction} from 'i18next';
import {useTranslation} from 'react-i18next';
import {FormInput} from '../common/Form';
import {Box, Row} from 'native-base';

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

export type IntervalFormInput = {
  label: string;
  start: string;
  end: string;
};

export const IntervalForm = () => {
  const {t} = useTranslation();
  return (
    <>
      <FormInput
        name="label"
        helpText={t('soil.depth_interval.label_help', {
          max: FORM_LABEL_MAX,
        })}
        placeholder={t('soil.depth_interval.label_placeholder')}
        variant="underlined"
      />
      <Box height="20px" />
      <Row justifyContent="space-between" space="40px">
        <Box flex={1}>
          <FormInput
            name="start"
            variant="underlined"
            placeholder={t('soil.depth_interval.start_label', {
              unit: 'cm',
            })}
          />
        </Box>
        <Box flex={1}>
          <FormInput
            name="end"
            variant="underlined"
            placeholder={t('soil.depth_interval.end_label', {
              unit: 'cm',
            })}
          />
        </Box>
      </Row>
    </>
  );
};
