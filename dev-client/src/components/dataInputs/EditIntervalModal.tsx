import {useDispatch, useSelector} from '../../model/store';
import {
  DepthInterval,
  sameDepth,
  updateSoilDataDepthInterval,
  soilPitMethods,
  methodEnabled,
  SoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {fromEntries} from 'terraso-client-shared/utils';
import {useMemo, useCallback} from 'react';
import {intervalSchema, IntervalForm, IntervalFormInput} from './IntervalForm';
import * as yup from 'yup';
import {useTranslation} from 'react-i18next';
import {Heading, Row, Box, Button} from 'native-base';
import {Formik} from 'formik';
import {FormCheckbox, FormSwitch} from '../common/Form';
import {useModal} from '../common/Modal';

type EditIntervalFormInput = IntervalFormInput &
  Omit<SoilDataDepthInterval, 'label' | 'depthInterval'> & {
    applyToAll: boolean;
  };

type Props = {
  siteId: string;
  depthInterval: DepthInterval;
};
export const EditIntervalModal = ({siteId, depthInterval}: Props) => {
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]);
  const dispatch = useDispatch();
  const onClose = useModal()!.onClose;

  const existingIntervals = useMemo(
    () => soilData.depthIntervals.map(interval => interval.depthInterval),
    [soilData.depthIntervals],
  );
  const interval = useMemo(
    () => soilData.depthIntervals.find(sameDepth({depthInterval}))!,
    [soilData.depthIntervals, depthInterval],
  );

  const schema = useMemo(
    () =>
      intervalSchema({t, existingIntervals}).shape({
        applyToAll: yup.boolean().required(),
        ...fromEntries(
          soilPitMethods
            .map(methodEnabled)
            .map(method => [method, yup.boolean().required()]),
        ),
      }),
    [t, existingIntervals],
  );

  const onSubmit = useCallback(
    async (values: EditIntervalFormInput) => {
      // TODO: actually use the applyToAll variable
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {start, end, applyToAll, ...newInterval} = schema.cast(values);
      await dispatch(
        updateSoilDataDepthInterval({
          siteId,
          ...newInterval,
          depthInterval: {start, end},
        }),
      );
      onClose();
    },
    [schema, dispatch, onClose, siteId],
  );

  return (
    <Formik
      validationSchema={schema}
      initialValues={{
        ...interval,
        start: '',
        end: '',
        applyToAll: false,
      }}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <>
          <Heading variant="h6">{t('soil.depth_interval.edit_title')}</Heading>
          <Box height="20px" />
          <IntervalForm />
          <Box height="50px" />
          <Heading variant="h6">
            {t('soil.depth_interval.data_inputs_title')}
          </Heading>
          {soilPitMethods.map(method => (
            <FormSwitch
              name={methodEnabled(method)}
              value={interval[methodEnabled(method)]}
              onChange={value =>
                dispatch(
                  updateSoilDataDepthInterval({
                    siteId,
                    depthInterval,
                    [methodEnabled(method)]: value,
                  }),
                )
              }
              label={t(`soil.collection_method.${method}`)}
            />
          ))}
          <FormCheckbox
            name="applyToAll"
            label={t('soil.depth_interval.apply_to_all_label')}
          />
          <Row>
            <Button
              size="lg"
              mx="auto"
              onPress={() => handleSubmit()}
              isDisabled={!isValid || isSubmitting}>
              {t('general.add')}
            </Button>
          </Row>
        </>
      )}
    </Formik>
  );
};
