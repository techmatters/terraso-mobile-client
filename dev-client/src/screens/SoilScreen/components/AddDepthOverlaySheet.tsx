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

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {
  DepthForm,
  DepthFormInput,
} from 'terraso-mobile-client/components/DepthForm';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {
  DepthInterval,
  LabelledDepthInterval,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {depthSchema} from 'terraso-mobile-client/schemas/depthSchema';
import {AddSoilDepthButton} from 'terraso-mobile-client/screens/SoilScreen/components/AddSoilDepthButton';

type Props = {
  onSubmit: (_: LabelledDepthInterval) => Promise<void>;
  existingDepths: {depthInterval: DepthInterval}[];
};

export const AddDepthOverlaySheet = ({
  onSubmit: parentOnSubmit,
  existingDepths,
}: Props) => {
  const {t} = useTranslation();
  // TODO-cknipe: Rename a bunch of modal stuff
  // Do we want to not use ModalHandle type here?
  const modalRef = useRef<ModalHandle>(null);
  const onClose = useCallback(() => modalRef.current?.onClose(), [modalRef]);

  const schema = useMemo(
    () => depthSchema({t, existingDepths}),
    [t, existingDepths],
  );

  const onSubmit = async (values: DepthFormInput) => {
    const {label, ...depthInterval} = schema.cast(values);
    await parentOnSubmit({label: label ?? '', depthInterval});
    onClose();
  };

  return (
    <InfoSheet
      ref={modalRef}
      trigger={onOpen => <AddSoilDepthButton onPress={onOpen} />}
      heading={<TranslatedHeading i18nKey="soil.depth.add_title" />}>
      <Formik<DepthFormInput>
        validationSchema={schema}
        initialValues={{
          label: '',
          start: '',
          end: '',
        }}
        onSubmit={onSubmit}>
        {({handleSubmit, isValid, isSubmitting, dirty}) => (
          <>
            <DepthForm />
            <Box height="50px" />
            <ContainedButton
              size="lg"
              onPress={() => handleSubmit()}
              disabled={!isValid || isSubmitting || !dirty}
              label={t('general.add')}
            />
          </>
        )}
      </Formik>
    </InfoSheet>
  );
};
