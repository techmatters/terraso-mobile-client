import {Button, Modal, Row} from 'native-base';
import {CardCloseButton} from '../common/Card';
import {Formik} from 'formik';
import * as yup from 'yup';
import {FORM_LABEL_MAX} from '../../constants';
import {useMemo} from 'react';
import {useSelector} from '../../model/store';
import {
  DepthInterval,
  updateSoilData,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {FormInput} from '../common/Form';
import {useTranslation} from 'react-i18next';

type Props = {
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
};

export const AddIntervalModal = ({siteId, isOpen, onClose}: Props) => {
  const {t} = useTranslation();
  const existingIntervals = useSelector(
    state => state.soilId.soilData[siteId].depthIntervals,
  );

  const schema = useMemo(
    () =>
      yup.object({
        name: yup
          .string()
          .max(
            FORM_LABEL_MAX,
            t('site.depth_interval.label_help', {max: FORM_LABEL_MAX}),
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
      }),
    [t, existingIntervals],
  );

  const onSubmit = (values: DepthInterval) => {
    const index = existingIntervals.findIndex(
      existing => existing.end <= values.start,
    );
    const newIntervals =
      index === -1
        ? [values, ...existingIntervals]
        : [
            ...existingIntervals.slice(0, index + 1),
            values,
            ...existingIntervals.slice(index + 2),
          ];
    updateSoilData({siteId, depthIntervals: newIntervals});
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content>
        <CardCloseButton onPress={onClose} />
        <Formik
          validationSchema={schema}
          initialValues={{
            name: '',
            start: '',
            end: '',
          }}
          onSubmit={values => onSubmit(schema.validateSync(values))}>
          {({handleSubmit, isValid, isSubmitting}) => (
            <>
              <FormInput
                name="name"
                helpText={t('site.depth_interval.label_help')}
                placeholder={t('site.depth_interval.label_placeholder')}
                variant="underlined"
              />
              <Row justifyContent="space-between" space="40px">
                <FormInput
                  name="start"
                  variant="underlined"
                  label={t('site.depth_interval.start_label', {
                    unit: 'cm',
                  })}
                />
                <FormInput
                  name="end"
                  variant="underlined"
                  label={t('site.depth_interval.end_label', {
                    unit: 'cm',
                  })}
                />
              </Row>
              <Button
                size="lg"
                mx="auto"
                onPress={() => handleSubmit()}
                isDisabled={!isValid || isSubmitting}>
                {t('general.add')}
              </Button>
            </>
          )}
        </Formik>
      </Modal.Content>
    </Modal>
  );
};
