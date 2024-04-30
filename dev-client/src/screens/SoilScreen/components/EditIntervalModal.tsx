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

import {useDispatch} from 'terraso-mobile-client/store';
import {
  DepthInterval,
  sameDepth,
  updateSoilDataDepthInterval,
  soilPitMethods,
  methodEnabled,
  SoilDataDepthInterval,
  SoilPitMethod,
  deleteSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {fromEntries} from 'terraso-client-shared/utils';
import {useMemo, useCallback, FormEvent, useRef} from 'react';
import {
  IntervalForm,
  IntervalFormInput,
} from 'terraso-mobile-client/components/IntervalForm';
import {intervalSchema} from 'terraso-mobile-client/schemas/intervalSchema';
import * as yup from 'yup';
import {useTranslation} from 'react-i18next';
import {Button} from 'native-base';
import {Formik} from 'formik';
import {FormCheckbox} from 'terraso-mobile-client/components/form/FormCheckbox';
import {FormSwitch} from 'terraso-mobile-client/components/form/FormSwitch';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {SoilDataUpdateDepthIntervalMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {useSiteSoilIntervals} from 'terraso-client-shared/selectors';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {
  Row,
  Box,
  Heading,
  Column,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {renderDepthInterval} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';
import {BottomSheetModal} from 'terraso-mobile-client/components/modals/BottomSheetModal';

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

export const EditIntervalModal = ({
  siteId,
  depthInterval,
  requiredInputs,
  mutable,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const modalRef = useRef<ModalHandle>(null);
  const onClose = useCallback(() => modalRef.current?.onClose(), [modalRef]);

  const allIntervals = useSiteSoilIntervals(siteId);
  const thisInterval = allIntervals
    .map(({interval}) => interval)
    .find(sameDepth({depthInterval}))!;

  const existingIntervals = useMemo(
    () =>
      allIntervals
        .map(({interval}) => interval)
        .filter(interval => !sameDepth(thisInterval)(interval)),
    [allIntervals, thisInterval],
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
        updateSoilDataDepthInterval({
          siteId,
          depthInterval,
          [methodEnabled(method)]: newValue,
        }),
      );
    },
    [dispatch, siteId, depthInterval],
  );

  const onSubmit = useCallback(
    async (values: EditIntervalFormInput) => {
      const {start, end} = depthInterval;
      const {
        start: newStart,
        end: newEnd,
        applyToAll,
        ...enabledInputs
      } = schema.cast(values);

      const input: SoilDataUpdateDepthIntervalMutationInput = {
        siteId,
        applyToIntervals: applyToAll
          ? existingIntervals.map(interval => interval.depthInterval)
          : undefined,
        ...enabledInputs,
        depthInterval: {start: newStart, end: newEnd},
      };
      if (newStart !== start || newEnd !== end) {
        await dispatch(
          deleteSoilDataDepthInterval({
            siteId,
            depthInterval,
          }),
        );
      }
      await dispatch(updateSoilDataDepthInterval(input));
      onClose();
    },
    [schema, dispatch, onClose, siteId, depthInterval, existingIntervals],
  );

  const deleteInterval = useCallback(() => {
    dispatch(
      deleteSoilDataDepthInterval({
        siteId,
        depthInterval,
      }),
    );
    onClose();
  }, [dispatch, depthInterval, siteId, onClose]);

  return (
    <BottomSheetModal
      ref={modalRef}
      trigger={onOpen => (
        <IconButton
          name="more-vert"
          _icon={{color: 'primary.contrast'}}
          onPress={onOpen}
        />
      )}
      Header={
        <Heading variant="h6">
          {mutable
            ? t('soil.depth_interval.edit_title')
            : renderDepthInterval(t, thisInterval)}
        </Heading>
      }>
      <Formik
        validationSchema={schema}
        initialValues={{
          ...thisInterval,
          start: String(depthInterval.start),
          end: String(depthInterval.end),
          applyToAll: false,
        }}
        onSubmit={onSubmit}>
        {({handleSubmit, isValid, isSubmitting}) => (
          <Column mb="23px" mx="15px">
            {mutable && (
              <>
                <Box pl="2px" mb="11px">
                  <IntervalForm />
                </Box>
                <Heading variant="h6">
                  {t('soil.depth_interval.data_inputs_title')}
                </Heading>
              </>
            )}
            <Column space="20px" mb="12px">
              {soilPitMethods.map(method => (
                <InputFormSwitch
                  method={method}
                  isRequired={requiredInputs.includes(method)}
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

            <Row justifyContent="flex-end">
              {mutable && (
                <ConfirmModal
                  trigger={onOpen => (
                    <Button
                      px="11px"
                      leftIcon={<Icon name="delete" color="error.main" />}
                      _text={{textTransform: 'uppercase', color: 'error.main'}}
                      variant="link"
                      size="lg"
                      onPress={onOpen}>
                      {t('soil.depth_interval.delete_depth')}
                    </Button>
                  )}
                  title={t('soil.depth_interval.delete_modal.title')}
                  body={t('soil.depth_interval.delete_modal.body')}
                  actionName={t('soil.depth_interval.delete_modal.action')}
                  handleConfirm={deleteInterval}
                />
              )}
              <Box flex={1} />
              <ConfirmEditingModal
                formNotReady={!isValid || isSubmitting}
                handleSubmit={handleSubmit}
                interval={depthInterval}
              />
            </Row>
          </Column>
        )}
      </Formik>
    </BottomSheetModal>
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
      value={isRequired ? true : undefined}
      name={methodEnabled(method)}
      disabled={isRequired}
      onChange={formSwitchChange}
      label={label}
    />
  );
};
