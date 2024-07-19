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

import {FormEvent, useCallback, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik} from 'formik';
import {Button} from 'native-base';
import * as yup from 'yup';

import {SoilDataUpdateDepthIntervalMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {useSiteSoilIntervals} from 'terraso-client-shared/selectors';
import {
  deleteSoilDataDepthInterval,
  DepthInterval,
  methodEnabled,
  sameDepth,
  SoilDataDepthInterval,
  SoilPitMethod,
  soilPitMethods,
  updateSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {fromEntries} from 'terraso-client-shared/utils';

import DeleteButton from 'terraso-mobile-client/components/buttons/DeleteButton';
import {
  DepthForm,
  DepthFormInput,
} from 'terraso-mobile-client/components/DepthForm';
import {FormCheckbox} from 'terraso-mobile-client/components/form/FormCheckbox';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {FormSwitch} from 'terraso-mobile-client/components/form/FormSwitch';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {ConfirmDeleteDepthModal} from 'terraso-mobile-client/components/modals/ConfirmDeleteDepthModal';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {OverlaySheet} from 'terraso-mobile-client/components/sheets/OverlaySheet';
import {depthSchema} from 'terraso-mobile-client/schemas/depthSchema';
import {renderDepth} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';
import {useDispatch} from 'terraso-mobile-client/store';
import {SWITCH_PADDING} from 'terraso-mobile-client/theme';

type EditDepthFormInput = DepthFormInput &
  Omit<SoilDataDepthInterval, 'label' | 'depthInterval'> & {
    applyToAll: boolean;
  };

type Props = {
  siteId: string;
  depthInterval: DepthInterval;
  mutable: boolean;
  requiredInputs: SoilPitMethod[];
};

export const EditDepthModal = ({
  siteId,
  depthInterval,
  requiredInputs,
  mutable,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const modalRef = useRef<ModalHandle>(null);
  const onClose = useCallback(() => modalRef.current?.onClose(), [modalRef]);

  const allDepths = useSiteSoilIntervals(siteId);
  const thisDepth = allDepths
    .map(({interval}) => interval)
    .find(sameDepth({depthInterval}))!;

  const existingDepths = useMemo(
    () =>
      allDepths
        .map(({interval}) => interval)
        .filter(interval => !sameDepth(thisDepth)(interval)),
    [allDepths, thisDepth],
  );

  const schema = useMemo(
    () =>
      depthSchema({t, existingDepths}).shape({
        applyToAll: yup.boolean().required(),
        ...fromEntries(
          soilPitMethods
            .map(methodEnabled)
            .map(method => [method, yup.boolean().required()]),
        ),
      }),
    [t, existingDepths],
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
    async (values: EditDepthFormInput) => {
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
          ? existingDepths.map(depth => depth.depthInterval)
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
    [schema, dispatch, onClose, siteId, depthInterval, existingDepths],
  );

  const deleteDepth = useCallback(() => {
    dispatch(
      deleteSoilDataDepthInterval({
        siteId,
        depthInterval,
      }),
    );
    onClose();
  }, [dispatch, depthInterval, siteId, onClose]);

  return (
    <OverlaySheet
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
          {mutable ? t('soil.depth.edit_title') : renderDepth(t, thisDepth)}
        </Heading>
      }>
      <Formik
        validationSchema={schema}
        initialValues={{
          ...thisDepth,
          start: String(depthInterval.start),
          end: String(depthInterval.end),
          applyToAll: false,
        }}
        onSubmit={onSubmit}>
        {({handleSubmit, isValid, isSubmitting}) => (
          <Column mb="23px">
            {mutable && (
              <>
                <Box pl="2px" mb="11px">
                  <DepthForm />
                </Box>
                <Heading variant="h6" mt="11px" mb="11px">
                  {t('soil.depth.data_inputs_title')}
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
              <FormLabel variant="body1" ml={SWITCH_PADDING}>
                {t('soil.depth.apply_to_all_label')}
              </FormLabel>
            </Row>

            <Row justifyContent="flex-end">
              {mutable && (
                <ConfirmDeleteDepthModal
                  onConfirm={deleteDepth}
                  trigger={onOpen => (
                    <DeleteButton
                      label={t('soil.depth.delete_button')}
                      onPress={onOpen}
                      mr="20px"
                    />
                  )}
                />
              )}
              <ConfirmEditingModal
                formNotReady={!isValid || isSubmitting}
                handleSubmit={handleSubmit}
                interval={depthInterval}
              />
            </Row>
          </Column>
        )}
      </Formik>
    </OverlaySheet>
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
      title={t('soil.depth.update_modal.title')}
      body={t('soil.depth.update_modal.body')}
      actionName={t('soil.depth.update_modal.action')}
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
