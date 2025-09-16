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
import {useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik} from 'formik';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {
  getDepthOverlaySheetSchema,
  getInitialValuesForSiteAdd,
  getUpdateDepthActionInputFromFormInput,
  SiteDepthFormInput,
} from 'terraso-mobile-client/components/form/depthInterval/depthOverlaySheetHelpers';
import {DepthTextForm} from 'terraso-mobile-client/components/form/depthInterval/DepthTextInputs';
import {EnabledInputToggles} from 'terraso-mobile-client/components/form/depthInterval/EnabledInputToggles';
import {
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {
  DepthInterval,
  SoilPitMethod,
  updateSoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useDispatch} from 'terraso-mobile-client/store';

type Props = {
  siteId: string;
  existingDepths: {depthInterval: DepthInterval}[];
  requiredInputs: SoilPitMethod[];
  trigger: ModalTrigger;
};

export const AddDepthOverlaySheet = ({
  siteId,
  existingDepths,
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
  const schema = getDepthOverlaySheetSchema(t, existingDepths);

  const onSubmit = useCallback(
    async (values: SiteDepthFormInput) => {
      const input = getUpdateDepthActionInputFromFormInput(
        values,
        schema,
        siteId,
        existingDepths,
      );
      await dispatch(updateSoilDataDepthInterval(input));
      onClose();
    },
    [siteId, dispatch, onClose, schema, existingDepths],
  );

  return (
    <InfoSheet
      ref={overlayRef}
      trigger={trigger}
      heading={<TranslatedHeading i18nKey="soil.depth.add_title" />}>
      <Formik<SiteDepthFormInput>
        validationSchema={schema}
        initialValues={getInitialValuesForSiteAdd(requiredInputs)}
        onSubmit={onSubmit}>
        {({handleSubmit, isValid, isSubmitting, dirty}) => {
          return (
            <>
              <DepthTextForm />
              <EnabledInputToggles requiredInputs={requiredInputs} />
              <Row justifyContent="flex-end" alignItems="center" space={5}>
                <ContainedButton
                  size="lg"
                  onPress={() => handleSubmit()}
                  disabled={!isValid || isSubmitting || !dirty}
                  label={t('general.save')}
                />
              </Row>
            </>
          );
        }}
      </Formik>
    </InfoSheet>
  );
};
