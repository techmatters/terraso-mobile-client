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

import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  DepthInterval,
  sameDepth,
  updateSoilDataDepthIntervalAsync,
  soilPitMethods,
  methodEnabled,
  SoilDataDepthInterval,
  SoilPitMethod,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {fromEntries} from 'terraso-client-shared/utils';
import {useMemo, useCallback} from 'react';
import {
  IntervalForm,
  IntervalFormInput,
} from 'terraso-mobile-client/components/IntervalForm';
import {intervalSchema} from 'terraso-mobile-client/schemas/intervalSchema';
import * as yup from 'yup';
import {useTranslation} from 'react-i18next';
import {Heading, Row, Box, Button} from 'native-base';
import {Formik} from 'formik';
import {FormCheckbox} from 'terraso-mobile-client/components/form/FormCheckbox';
import {FormSwitch} from 'terraso-mobile-client/components/form/FormSwitch';
import {useModal} from 'terraso-mobile-client/components/Modal';

import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';

type EditIntervalFormInput = IntervalFormInput &
  Omit<SoilDataDepthInterval, 'label' | 'depthInterval'> & {
    applyToAll: boolean;
  };

type Props = {
  siteId: string;
  depthInterval: DepthInterval;
  requiredInputs: SoilPitMethod[];
};

export const EditIntervalModalContent = ({
  siteId,
  depthInterval,
  requiredInputs,
}: Props) => {
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

  const requiredInputsSet = useMemo(
    () => new Set(requiredInputs),
    [requiredInputs],
  );

  const inputsWithRequired = useMemo(
    () =>
      soilPitMethods.map(
        method => [method, requiredInputsSet.has(method)] as const,
      ),
    [requiredInputsSet],
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

  const showUpdateWarning = useMemo(
    () => soilData.depthDependentData.length > 0,
    [soilData],
  );

  const updateSwitch = useCallback(
    (method: SoilPitMethod) => (newValue: boolean) => {
      dispatch(
        updateSoilDataDepthIntervalAsync({
          siteId,
          depthInterval,
          [methodEnabled(method)]: newValue,
        }),
      );
    },
    [dispatch, depthInterval, siteId],
  );

  const onSubmit = useCallback(
    async (values: EditIntervalFormInput) => {
      const {start, end, ...newInterval} = schema.cast(values);
      await dispatch(
        updateSoilDataDepthIntervalAsync({
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
          {inputsWithRequired.map(([method, isRequired]) => (
            <InputFormSwitch
              method={method}
              isRequired={isRequired}
              value={interval[methodEnabled(method)]}
              updateEnabled={updateSwitch(method)}
              key={method}
            />
          ))}
          <FormCheckbox
            name="applyToAll"
            label={t('soil.depth_interval.apply_to_all_label')}
          />
          <Row>
            {showUpdateWarning ? (
              <ConfirmModal
                trigger={onOpen => (
                  <AddButton
                    action={onOpen}
                    isDisabled={!isValid || isSubmitting}
                  />
                )}
                title={t('soil.depth_interval.update_modal.title')}
                body={t('soil.depth_interval.update_modal.body')}
                actionName={t('soil.depth_interval.update_modal.action')}
                handleConfirm={() => handleSubmit()}
              />
            ) : (
              <AddButton
                action={() => handleSubmit()}
                isDisabled={!isValid || isSubmitting}
              />
            )}
          </Row>
        </>
      )}
    </Formik>
  );
};

type AddButtonProps = {
  action: () => void;
  isDisabled: boolean;
};

const AddButton = ({action, isDisabled}: AddButtonProps) => {
  const {t} = useTranslation();

  return (
    <Button size="lg" mx="auto" onPress={action} isDisabled={isDisabled}>
      {t('general.add')}
    </Button>
  );
};

type SwitchProps = {
  method: SoilPitMethod;
  isRequired: boolean;
  value: boolean;
  updateEnabled: (newValue: boolean) => void;
};

const InputFormSwitch = ({
  method,
  isRequired,
  value,
  updateEnabled,
}: SwitchProps) => {
  const {t} = useTranslation();

  const label = useMemo(() => {
    const methodDescriber = t(`soil.collection_method.${method}`);
    return isRequired
      ? t('soil.required_method', {method: methodDescriber})
      : methodDescriber;
  }, [t, method, isRequired]);

  return (
    <FormSwitch
      name={methodEnabled(method)}
      value={isRequired || value}
      disabled={isRequired}
      onChange={updateEnabled}
      label={label}
    />
  );
};
