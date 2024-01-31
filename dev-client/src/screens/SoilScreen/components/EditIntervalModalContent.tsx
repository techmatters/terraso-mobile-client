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
  deleteSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {DEFAULT_ENABLED_SOIL_PIT_METHODS} from 'terraso-client-shared/constants';
import {fromEntries} from 'terraso-client-shared/utils';
import {useMemo, useCallback, FormEvent, useState} from 'react';
import {
  IntervalForm,
  IntervalFormInput,
} from 'terraso-mobile-client/components/IntervalForm';
import {intervalSchema} from 'terraso-mobile-client/schemas/intervalSchema';
import * as yup from 'yup';
import {useTranslation} from 'react-i18next';
import {Heading, Button} from 'native-base';
import {Formik} from 'formik';
import {FormCheckbox} from 'terraso-mobile-client/components/form/FormCheckbox';
import {FormSwitch} from 'terraso-mobile-client/components/form/FormSwitch';
import {useModal} from 'terraso-mobile-client/components/Modal';

import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {useSiteRoleContext} from 'terraso-mobile-client/context/SiteRoleContext';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {SoilDataUpdateDepthIntervalMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {selectSoilDataIntervals} from 'terraso-client-shared/selectors';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {
  Row,
  Box,
  Column,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type EditIntervalFormInput = IntervalFormInput &
  Omit<SoilDataDepthInterval, 'label' | 'depthInterval'> & {
    applyToAll: boolean;
  };

type Props = {
  siteId: string;
  depthInterval: DepthInterval;
  mutable: boolean;
  requiredInputs: SoilPitMethod[];
};

export const EditIntervalModalContent = ({
  siteId,
  depthInterval,
  requiredInputs,
  mutable,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const onClose = useModal()!.onClose;

  const aggregatedIntervals = useSelector(state =>
    selectSoilDataIntervals(state, siteId),
  );

  const aggregatedInterval = useMemo(() => {
    return aggregatedIntervals.find(({interval: A}) =>
      sameDepth({depthInterval})(A),
    );
  }, [aggregatedIntervals, depthInterval]);

  const soilIntervals = useMemo(
    () => aggregatedIntervals.map(({interval}) => interval),
    [aggregatedIntervals],
  );

  const interval = useMemo(() => {
    return soilIntervals.find(sameDepth({depthInterval}))!;
  }, [soilIntervals, depthInterval]);

  const [currentInterval] = useState(interval);

  const existingIntervals = useMemo(
    () =>
      soilIntervals
        .map(i => i.depthInterval)
        .filter(
          ({start, end}) =>
            start !== currentInterval.depthInterval.start ||
            end !== currentInterval.depthInterval.end,
        ),
    [soilIntervals, currentInterval],
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

  const defaultInputs = useMemo(() => {
    if (!aggregatedInterval?.backendIntervalExists) {
      return DEFAULT_ENABLED_SOIL_PIT_METHODS.reduce(
        (x, key) => ({...x, [methodEnabled(key)]: true}),
        {},
      );
    }
    return {};
  }, [aggregatedInterval]);

  const updateSwitch = useCallback(
    (method: SoilPitMethod) => (newValue: boolean) => {
      dispatch(
        updateSoilDataDepthIntervalAsync({
          siteId,
          depthInterval,
          ...defaultInputs,
          [methodEnabled(method)]: newValue,
        }),
      );
    },
    [dispatch, depthInterval, siteId, defaultInputs],
  );

  const onSubmit = useCallback(
    async (values: EditIntervalFormInput) => {
      const {
        depthInterval: {start, end},
      } = currentInterval;
      const {
        start: newStart,
        end: newEnd,
        applyToAll,
        ...enabledInputs
      } = schema.cast(values);

      let applyToIntervals = {};
      if (applyToAll) {
        applyToIntervals = {applyToIntervals: existingIntervals};
      }

      const input: SoilDataUpdateDepthIntervalMutationInput = {
        siteId,
        ...applyToIntervals,
        ...enabledInputs,
        depthInterval: {start: newStart, end: newEnd},
      };
      if (newStart !== start || newEnd !== end) {
        await dispatch(
          deleteSoilDataDepthInterval({
            siteId,
            depthInterval: {start, end},
          }),
        );
      }
      await dispatch(updateSoilDataDepthInterval(input));
      onClose();
    },
    [schema, dispatch, onClose, siteId, currentInterval, existingIntervals],
  );

  const deleteInterval = useCallback(() => {
    dispatch(
      deleteSoilDataDepthInterval({
        siteId,
        depthInterval: currentInterval.depthInterval,
      }),
    );
    onClose();
  }, [dispatch, currentInterval, siteId, onClose]);

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
        ...{...currentInterval, ...{label: currentInterval.label || ''}},
        start: String(currentInterval.depthInterval.start),
        end: String(currentInterval.depthInterval.end),
        applyToAll: false,
      }}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <Column mt="34px" mb="23px" mx="15px">
          <Heading variant="h6">{t('soil.depth_interval.edit_title')}</Heading>
          <Box pl="2px" mb="11px">
            <IntervalForm
              displayLabel={'label' in currentInterval}
              editable={mutable}
            />
          </Box>

          <Heading variant="h6">
            {t('soil.depth_interval.data_inputs_title')}
          </Heading>

          <Column space="20px" mt="17px" mb="12px">
            {inputsWithRequired.map(([method, isRequired]) => (
              <InputFormSwitch
                method={method}
                disabled={!editingAllowed}
                isRequired={isRequired}
                updateEnabled={updateSwitch(method)}
                key={method}
              />
            ))}
          </Column>

          <Row mb="12px">
            <FormCheckbox name="applyToAll" />
            <FormLabel variant="body1">
              {t('soil.depth_interval.apply_to_all_label')}
            </FormLabel>
          </Row>

          {editingAllowed ? (
            <Row justifyContent="space-between">
              <Button
                px="11px"
                leftIcon={<Icon name="delete" color="error.main" />}
                _text={{textTransform: 'uppercase', color: 'error.main'}}
                variant="link"
                size="lg"
                onPress={deleteInterval}>
                {t('soil.depth_interval.delete_depth')}
              </Button>
              <ConfirmEditingModal
                formNotReady={!isValid || isSubmitting}
                handleSubmit={handleSubmit}
                interval={currentInterval?.depthInterval}
              />
            </Row>
          ) : undefined}
        </Column>
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
 * or end.
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
    [handleSubmit, showWarningModal],
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
  updateEnabled: (newValue: boolean) => void;
} & React.ComponentProps<typeof FormSwitch>;

const InputFormSwitch = ({
  method,
  isRequired,
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

  const {onChange} = useFieldContext<boolean>(methodEnabled(method));

  const formSwitchChange = useCallback(
    (newValue: boolean) => {
      updateEnabled(newValue);
      if (onChange) {
        onChange(newValue);
      }
    },
    [onChange, updateEnabled],
  );

  return (
    <FormSwitch
      {...props}
      name={methodEnabled(method)}
      disabled={isRequired || disabled}
      onChange={formSwitchChange}
      label={label}
    />
  );
};
