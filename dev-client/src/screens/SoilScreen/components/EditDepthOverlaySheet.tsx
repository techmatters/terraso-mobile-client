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

import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {ConfirmEditingModal} from 'terraso-mobile-client/components/form/depthInterval/ConfirmEditingModal';
import {DeleteDepthButton} from 'terraso-mobile-client/components/form/depthInterval/DeleteDepthButton';
import {
  getDepthOverlaySheetSchema,
  getInitialValuesForSiteEdit,
  getUpdateDepthActionInputFromFormInput,
  SiteDepthFormInput,
} from 'terraso-mobile-client/components/form/depthInterval/depthOverlaySheetHelpers';
import {DepthTextForm} from 'terraso-mobile-client/components/form/depthInterval/DepthTextInputs';
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
  sameDepth,
  SoilPitMethod,
  updateSoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useDispatch} from 'terraso-mobile-client/store';
import {AggregatedInterval} from 'terraso-mobile-client/store/depthIntervalHelpers';

type Props = {
  siteId: string;
  thisInterval: AggregatedInterval;
  allExistingDepths: {depthInterval: DepthInterval}[];
  requiredInputs: SoilPitMethod[];
  trigger: ModalTrigger;
};

export const EditDepthOverlaySheet = ({
  siteId,
  thisInterval,
  allExistingDepths,
  requiredInputs,
  trigger,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const overlayRef = useRef<ModalHandle>(null);
  const onClose = useCallback(
    () => overlayRef.current?.onClose(),
    [overlayRef],
  );

  const thisDepthInterval = thisInterval.interval.depthInterval;
  const otherExistingDepths = useMemo(
    () =>
      allExistingDepths.filter(
        existingInterval => !sameDepth(thisInterval.interval)(existingInterval),
      ),
    [thisInterval, allExistingDepths],
  );

  const schema = getDepthOverlaySheetSchema(t, otherExistingDepths);
  const mutable = !thisInterval.isFromPreset;

  const onSubmit = useCallback(
    async (values: SiteDepthFormInput) => {
      const {start: newStart, end: newEnd} = schema.cast(values);
      if (
        newStart !== thisDepthInterval.start ||
        newEnd !== thisDepthInterval.end
      ) {
        await dispatch(
          deleteSoilDataDepthInterval({
            siteId,
            depthInterval: thisDepthInterval,
          }),
        );
      }

      const input = getUpdateDepthActionInputFromFormInput(
        values,
        schema,
        siteId,
        otherExistingDepths,
      );
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
      ref={overlayRef}
      trigger={trigger}
      heading={<TranslatedHeading i18nKey="soil.depth.edit_title" />}>
      <Formik<SiteDepthFormInput>
        validationSchema={schema}
        initialValues={getInitialValuesForSiteEdit(thisInterval)}
        onSubmit={onSubmit}>
        {({handleSubmit, isValid, isSubmitting, dirty}) => {
          return (
            <Column>
              {mutable && <DepthTextForm />}

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
