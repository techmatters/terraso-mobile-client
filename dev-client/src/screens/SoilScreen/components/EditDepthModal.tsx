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

import React, {FormEvent, useCallback, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik} from 'formik';
import * as yup from 'yup';

import {SoilDataUpdateDepthIntervalMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {fromEntries} from 'terraso-client-shared/utils';

import {DeleteButton} from 'terraso-mobile-client/components/buttons/common/DeleteButton';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {
  DepthFormInput,
  DepthTextInputs,
} from 'terraso-mobile-client/components/form/depthInterval/DepthTextInputs';
import {FormCheckbox} from 'terraso-mobile-client/components/form/FormCheckbox';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {FormSwitch} from 'terraso-mobile-client/components/form/FormSwitch';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {ConfirmDeleteDepthModal} from 'terraso-mobile-client/components/modals/ConfirmDeleteDepthModal';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {
  deleteSoilDataDepthInterval,
  DepthInterval,
  methodEnabled,
  sameDepth,
  SoilDataDepthInterval,
  SoilPitMethod,
  soilPitMethods,
  updateSoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {depthSchema} from 'terraso-mobile-client/schemas/depthSchema';
import {renderDepth} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';
import {useDispatch} from 'terraso-mobile-client/store';
import {useSiteSoilIntervals} from 'terraso-mobile-client/store/selectors';
import {
  SWITCH_PADDING,
  SWITCH_VERTICAL_PADDING,
} from 'terraso-mobile-client/theme';

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

// TODO-cknipe: Stop using this, use EditDepthOverlaySheet instead
export const EditDepthModal = ({
  siteId,
  depthInterval,
  requiredInputs,
  mutable,
}: Props) => {
  const {t, i18n} = useTranslation();
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
    <InfoSheet
      ref={modalRef}
      trigger={onOpen => (
        <IconButton
          type="sm"
          variant="light"
          name="more-vert"
          onPress={onOpen}
        />
      )}
      heading={
        <Heading variant="h6">
          {thisDepth?.label ? thisDepth.label : renderDepth(t, thisDepth)}
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
        {({handleSubmit, isValid, isSubmitting, dirty}) => (
          <Column mb="23px">
            {mutable && (
              <>
                <Box pl="2px" mb="11px">
                  <DepthTextInputs />
                </Box>
                <Heading variant="h6" mt="11px" mb="11px">
                  {t('soil.depth.data_inputs_title')}
                </Heading>
              </>
            )}
            <Column space="10px" mb="12px">
              {soilPitMethods.map(method => {
                const descriptionExists = i18n.exists(
                  `soil.collection_method_description.${method}`,
                );
                const description = descriptionExists
                  ? t(`soil.collection_method_description.${method}`)
                  : '';

                return (
                  <React.Fragment key={method}>
                    <InputFormSwitch
                      method={method}
                      isRequired={requiredInputs.includes(method)}
                      key={method}
                    />
                    {description && (
                      <Text mb={SWITCH_VERTICAL_PADDING} variant="body2">
                        {description}
                      </Text>
                    )}
                  </React.Fragment>
                );
              })}
            </Column>

            <Row mb="12px">
              <FormCheckbox name="applyToAll" />
              <FormLabel variant="body1" ml={SWITCH_PADDING}>
                {t('soil.depth.apply_to_all_label')}
              </FormLabel>
            </Row>

            <Row justifyContent="flex-end" alignItems="center" space={5}>
              <ConfirmEditingModal
                formNotReady={!isValid || isSubmitting || !dirty}
                handleSubmit={handleSubmit}
                interval={depthInterval}
              />
            </Row>

            {mutable && (
              <ConfirmDeleteDepthModal
                onConfirm={deleteDepth}
                trigger={onOpen => (
                  <DeleteButton
                    label={t('soil.depth.delete_button')}
                    onPress={onOpen}
                  />
                )}
              />
            )}
          </Column>
        )}
      </Formik>
    </InfoSheet>
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
        <ContainedButton
          size="lg"
          onPress={buttonAction(onOpen)}
          disabled={formNotReady}
          label={t('general.save')}
        />
      )}
      title={t('soil.depth.update_modal.title')}
      body={t('soil.depth.update_modal.body')}
      actionLabel={t('soil.depth.update_modal.action')}
      handleConfirm={() => handleSubmit()}
    />
  );
};

type SwitchProps = {
  method: SoilPitMethod;
  isRequired: boolean;
} & React.ComponentProps<typeof FormSwitch>;

const InputFormSwitch = ({method, isRequired, ...props}: SwitchProps) => {
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
      if (onChange) {
        onChange(newValue);
      }
    },
    [onChange],
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
