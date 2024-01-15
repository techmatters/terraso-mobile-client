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
  updateSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {fromEntries} from 'terraso-client-shared/utils';
import {useMemo, useCallback, FormEvent, useEffect, useState} from 'react';
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
import {useSiteRoleContext} from 'terraso-mobile-client/context/SiteRoleContext';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {SoilDataUpdateDepthIntervalMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {Icon} from 'terraso-mobile-client/components/Icons';

type EditIntervalFormInput = IntervalFormInput &
  Omit<SoilDataDepthInterval, 'label' | 'depthInterval'> & {
    applyToAll: boolean;
  };

type Props = {
  siteId: string;
  depthInterval: DepthInterval;
  requiredInputs: string[];
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

  const interval = useMemo(() => {
    return soilData.depthIntervals.find(sameDepth({depthInterval}))!;
  }, [soilData.depthIntervals, depthInterval]);

  const [currentInterval] = useState<SoilDataDepthInterval>(interval);

  const existingIntervals = useMemo(
    () =>
      soilData.depthIntervals
        .map(interval => interval.depthInterval)
        .filter(
          ({start, end}) =>
            start !== currentInterval.depthInterval.start ||
            end !== currentInterval.depthInterval.end,
        ),
    [soilData.depthIntervals],
  );

  const requiredInputsSet = useMemo(
    () => new Set(requiredInputs),
    [requiredInputs],
  );

  const inputsWithRequired = useMemo(
    () =>
      soilPitMethods.map(
        method =>
          [method, requiredInputsSet.has(method)] as [SoilPitMethod, boolean],
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
      const {
        depthInterval: {start, end},
      } = currentInterval;
      const {
        start: newStart,
        end: newEnd,
        ...enabledInputs
      } = schema.cast(values);
      const input: SoilDataUpdateDepthIntervalMutationInput = {
        siteId,
        ...enabledInputs,
        depthInterval: {start, end},
      };
      if (newStart !== start || newEnd !== end) {
        input.newDepthInterval = {start: newStart, end: newEnd};
      }
      await dispatch(updateSoilDataDepthInterval(input));
      onClose();
    },
    [schema, dispatch, onClose, siteId, currentInterval],
  );

  const userRole = useSiteRoleContext();

  const editingAllowed = useMemo(() => {
    if (!userRole) {
      return false;
    }
    if (userRole.kind === 'site' && userRole.role === 'owner') {
      return true;
    }
    if (
      userRole.kind === 'project' &&
      (userRole.role === 'manager' || userRole.role === 'contributor')
    ) {
      return true;
    }
    return false;
  }, [userRole]);

  return (
    <Formik
      validationSchema={schema}
      initialValues={{
        ...currentInterval,
        start: String(currentInterval.depthInterval.start),
        end: String(currentInterval.depthInterval.end),
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
              disabled={!editingAllowed}
              isRequired={isRequired}
              value={currentInterval[methodEnabled(method)]}
              updateEnabled={updateSwitch(method)}
              key={method}
            />
          ))}

          <FormCheckbox
            name="applyToAll"
            label={t('soil.depth_interval.apply_to_all_label')}
          />

          {editingAllowed ? (
            <Row justifyContent="space-between" px="15px" pb="15px">
              <Button
                leftIcon={<Icon name="delete" color="error.main" />}
                _text={{textTransform: 'uppercase', color: 'error.main'}}
                variant="link">
                {t('soil.depth_interval.delete_depth')}
              </Button>
              <ConfirmEditingModal
                formNotReady={!isValid || isSubmitting}
                handleSubmit={handleSubmit}
                interval={currentInterval?.depthInterval}
              />
            </Row>
          ) : undefined}
        </>
      )}
    </Formik>
  );
};

type ModalProps = {
  formNotReady: boolean;
  handleSubmit: (e?: FormEvent<HTMLFormElement> | undefined) => void;
  interval: DepthInterval;
};

/**
 * Shows a modal warning if there have been changes to the interval start
 * and end.
 */
const ConfirmEditingModal = ({
  formNotReady,
  handleSubmit,
  interval: {start, end},
}: ModalProps) => {
  const {t} = useTranslation();

  const newStart = useFieldContext('start');
  const newEnd = useFieldContext('end');

  const showWarningModal = useMemo(() => {
    return Number(newStart.value) !== start || Number(newEnd.value) !== end;
  }, [start, end, newStart, newEnd]);

  const buttonAction = useMemo(
    () =>
      (onOpen: () => void) =>
      (...args: Parameters<typeof handleSubmit>) =>
        showWarningModal ? onOpen() : handleSubmit(...args),
    [newStart, newEnd, handleSubmit],
  );

  return (
    <ConfirmModal
      trigger={onOpen => (
        <SaveButton action={buttonAction(onOpen)} isDisabled={formNotReady} />
      )}
      title={t('soil.depth_interval.update_modal.title')}
      body={t('soil.depth_interval.update_modal.body')}
      actionName={t('soil.depth_interval.update_modal.action')}
      handleConfirm={() => handleSubmit()}
    />
  );
};

type AddButtonProps = {
  action: () => void;
  isDisabled: boolean;
};

const SaveButton = ({action, isDisabled}: AddButtonProps) => {
  const {t} = useTranslation();

  return (
    <Button
      flex={1}
      size="lg"
      mx="auto"
      onPress={action}
      isDisabled={isDisabled}
      _text={{textTransform: 'uppercase'}}>
      {t('general.save')}
    </Button>
  );
};

type SwitchProps = {
  method: SoilPitMethod;
  isRequired: boolean;
  value: boolean;
  updateEnabled: (newValue: boolean) => void;
} & React.ComponentProps<typeof FormSwitch>;

const InputFormSwitch = ({
  method,
  isRequired,
  value,
  updateEnabled,
  disabled,
  ...props
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
      {...props}
      name={methodEnabled(method)}
      value={isRequired || value}
      disabled={isRequired || disabled}
      onChange={updateEnabled}
      label={label}
    />
  );
};
