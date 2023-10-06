import {Box, Button, Heading} from 'native-base';
import {Formik} from 'formik';
import {useMemo} from 'react';
import {
  DepthInterval,
  LabelledDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {FormInput} from '../common/Form';
import {useTranslation} from 'react-i18next';
import {intervalSchema, IntervalForm} from './IntervalForm';
import {useModal} from '../common/Modal';

type Props = {
  onSubmit: (_: LabelledDepthInterval) => Promise<void>;
  existingIntervals: DepthInterval[];
};

type FormInput = {
  label: string;
  start: string;
  end: string;
};

export const AddIntervalModal = ({
  onSubmit: parentOnSubmit,
  existingIntervals,
}: Props) => {
  const {t} = useTranslation();
  const onClose = useModal()!.onClose;

  const schema = useMemo(
    () => intervalSchema({t, existingIntervals}),
    [t, existingIntervals],
  );

  const onSubmit = async (values: FormInput) => {
    const {label, ...depthInterval} = schema.cast(values);
    await parentOnSubmit({label: label ?? '', depthInterval});
    onClose();
  };

  return (
    <Formik<FormInput>
      validationSchema={schema}
      initialValues={{
        label: '',
        start: '',
        end: '',
      }}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <>
          <Heading variant="h6">{t('soil.depth_interval.add_title')}</Heading>
          <Box height="20px" />
          <IntervalForm />
          <Box height="50px" />
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
  );
};
