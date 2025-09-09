/*
 * Copyright © 2025 Technology Matters
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

import {useCallback, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik} from 'formik';
import * as yup from 'yup';

import {SoilDataUpdateDepthIntervalMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {fromEntries} from 'terraso-client-shared/utils';

import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {ConfirmEditingModal} from 'terraso-mobile-client/components/form/depthInterval/ConfirmEditingModal';
import {DeleteDepthButton} from 'terraso-mobile-client/components/form/depthInterval/DeleteDepthButton';
import {
  DepthFormInput,
  DepthTextInputs,
} from 'terraso-mobile-client/components/form/depthInterval/DepthTextInputs';
import {EnabledInputToggles} from 'terraso-mobile-client/components/form/depthInterval/EnabledInputToggles';
import {
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {Column, Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
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
import {useDispatch} from 'terraso-mobile-client/store';
import {AggregatedInterval} from 'terraso-mobile-client/store/depthIntervalHelpers';

// TODO-cknipe: Move to common file
export type EnabledInputMethodsInput = Omit<
  SoilDataDepthInterval,
  'label' | 'depthInterval'
>;
type EditDepthFormInput = DepthFormInput &
  EnabledInputMethodsInput & {
    applyToAll: boolean;
  };

type Props = {
  siteId: string;
  thisInterval: AggregatedInterval;
  existingDepths: {depthInterval: DepthInterval}[];
  requiredInputs: SoilPitMethod[];
  trigger: ModalTrigger;
};

export const EditDepthOverlaySheet = ({
  siteId,
  thisInterval,
  existingDepths,
  requiredInputs,
  trigger,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const modalRef = useRef<ModalHandle>(null);
  const onClose = useCallback(() => modalRef.current?.onClose(), [modalRef]);
  const mutable = !thisInterval.isFromPreset;
  const thisDepthInterval = thisInterval.interval.depthInterval;

  const otherExistingDepths = useMemo(
    () =>
      existingDepths.filter(
        existingInterval => !sameDepth(thisInterval.interval)(existingInterval),
      ),
    [thisInterval, existingDepths],
  );

  const schema = useMemo(
    () =>
      depthSchema({t, existingDepths: otherExistingDepths}).shape({
        applyToAll: yup.boolean().required(),
        ...fromEntries(
          soilPitMethods
            .map(methodEnabled)
            .map(method => [method, yup.boolean().required()]),
        ),
      }),
    [t, otherExistingDepths],
  );

  const onSubmit = useCallback(
    async (values: EditDepthFormInput) => {
      const {start, end} = thisDepthInterval;
      const {
        start: newStart,
        end: newEnd,
        applyToAll,
        label,
        ...enabledInputs
      } = schema.cast(values);

      const input: SoilDataUpdateDepthIntervalMutationInput = {
        siteId,
        applyToIntervals: applyToAll
          ? otherExistingDepths.map(depth => depth.depthInterval)
          : undefined,
        label,
        ...enabledInputs,
        depthInterval: {start: newStart, end: newEnd},
      };
      if (newStart !== start || newEnd !== end) {
        await dispatch(
          deleteSoilDataDepthInterval({
            siteId,
            depthInterval: thisDepthInterval,
          }),
        );
      }
      await dispatch(updateSoilDataDepthInterval(input));
      onClose();
    },
    [schema, dispatch, onClose, siteId, thisDepthInterval, otherExistingDepths],
  );

  const deleteDepth = useCallback(() => {
    dispatch(
      deleteSoilDataDepthInterval({
        siteId,
        depthInterval: thisDepthInterval,
      }),
    );
    onClose();
  }, [dispatch, thisDepthInterval, siteId, onClose]);

  return (
    <InfoSheet
      ref={modalRef}
      trigger={trigger}
      heading={<TranslatedHeading i18nKey="soil.depth.edit_title" />}>
      <Formik
        validationSchema={schema}
        initialValues={{
          start: String(thisDepthInterval.start),
          end: String(thisDepthInterval.end),
          applyToAll: false,
          // includes label and required methods
          ...thisInterval.interval,
        }}
        onSubmit={onSubmit}>
        {({handleSubmit, isValid, isSubmitting, dirty}) => {
          return (
            <Column>
              {mutable && <DepthTextInputs />}

              {/* TODO-cknipe: Is it ok to include the "Show/hide soil observations" title if not mutable? */}
              <EnabledInputToggles requiredInputs={requiredInputs} />

              <Row justifyContent="flex-end" alignItems="center" space={5}>
                <ConfirmEditingModal
                  formNotReady={!isValid || isSubmitting || !dirty}
                  handleSubmit={handleSubmit}
                  interval={thisDepthInterval}
                />
              </Row>

              {mutable && (
                <DeleteDepthButton deleteDepthCallback={deleteDepth} />
              )}
            </Column>
          );
        }}
      </Formik>
    </InfoSheet>
  );
};
