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

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {
  DepthFormInput,
  DepthTextInputs,
} from 'terraso-mobile-client/components/form/depthInterval/DepthTextInputs';
import {EnabledInputToggles} from 'terraso-mobile-client/components/form/depthInterval/EnabledInputToggles';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {
  DepthInterval,
  methodEnabled,
  SoilDataDepthInterval,
  SoilPitMethod,
  soilPitMethods,
  updateSoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {depthSchema} from 'terraso-mobile-client/schemas/depthSchema';
import {AddSoilDepthButton} from 'terraso-mobile-client/screens/SoilScreen/components/AddSoilDepthButton';
import {EnabledInputMethodsInput} from 'terraso-mobile-client/screens/SoilScreen/components/EditDepthOverlaySheet';
import {useDispatch} from 'terraso-mobile-client/store';

type Props = {
  siteId: string;
  existingDepths: {depthInterval: DepthInterval}[];
  requiredInputs: SoilPitMethod[];
};

// TODO-cknipe: This is duplicated
type EditDepthFormInput = DepthFormInput &
  Omit<SoilDataDepthInterval, 'label' | 'depthInterval'> & {
    applyToAll: boolean;
  };

export const AddDepthOverlaySheet = ({
  siteId,
  existingDepths,
  requiredInputs,
}: Props) => {
  const {t} = useTranslation();
  // TODO-cknipe: Rename a bunch of modal stuff
  // Do we want to not use ModalHandle type here?
  const modalRef = useRef<ModalHandle>(null);
  const dispatch = useDispatch();
  const onClose = useCallback(() => modalRef.current?.onClose(), [modalRef]);

  //   const schema = useMemo(
  //     () => depthSchema({t, existingDepths}),
  //     [t, existingDepths],
  //   );

  // TODO-cknipe: Duplicated between Add/Edit
  const schema = useMemo(
    () =>
      depthSchema({t, existingDepths}).shape({
        applyToAll: yup.boolean().required(),
        ...fromEntries(
          soilPitMethods
            .map(methodEnabled)
            .map(method => [method, yup.boolean().required()]),
          // TODO-cknipe: optional would enable the button...?
        ),
      }),
    [t, existingDepths],
  );

  const initiallyEnabledInputs = {} as EnabledInputMethodsInput;
  soilPitMethods.forEach(method => {
    const enabledName = methodEnabled(method);
    initiallyEnabledInputs[enabledName] = requiredInputs.includes(method);
  });

  // TODO-cknipe: Duplicated between Add/Edit
  const onSubmit = useCallback(
    async (values: DepthFormInput) => {
      // --> TODO-cknipe: Why is isValid false??
      const {label, start, end, applyToAll, ...enabledInputs} =
        schema.cast(values);

      const input: SoilDataUpdateDepthIntervalMutationInput = {
        siteId,
        applyToIntervals: applyToAll
          ? existingDepths.map(depth => depth.depthInterval)
          : undefined,
        label,
        ...enabledInputs,
        depthInterval: {start, end},
      };
      await dispatch(updateSoilDataDepthInterval(input));
      onClose();
    },
    [siteId, dispatch, onClose, schema, existingDepths],
  );

  return (
    <InfoSheet
      ref={modalRef}
      trigger={onOpen => <AddSoilDepthButton onPress={onOpen} />}
      heading={<TranslatedHeading i18nKey="soil.depth.add_title" />}>
      {/* // TODO-cknipe: This used to be DepthFormInput */}
      <Formik<EditDepthFormInput>
        validationSchema={schema}
        initialValues={{
          label: '',
          start: '',
          end: '',
          applyToAll: false,
          ...initiallyEnabledInputs,
        }}
        onSubmit={onSubmit}>
        {({handleSubmit, isValid, isSubmitting, dirty}) => {
          return (
            <>
              <DepthTextInputs />
              <EnabledInputToggles requiredInputs={requiredInputs} />
              <Box height="50px" />
              <ContainedButton
                size="lg"
                onPress={() => handleSubmit()}
                disabled={!isValid || isSubmitting || !dirty}
                label={t('general.add')}
              />
            </>
          );
        }}
      </Formik>
    </InfoSheet>
  );
};
