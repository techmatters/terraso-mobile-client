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

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik} from 'formik';
import {Button} from 'native-base';

import {
  DepthInterval,
  LabelledDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';

import {
  DepthForm,
  DepthFormInput,
} from 'terraso-mobile-client/components/DepthForm';
import {useModal} from 'terraso-mobile-client/components/modals/Modal';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {depthSchema} from 'terraso-mobile-client/schemas/depthSchema';

type Props = {
  onSubmit: (_: LabelledDepthInterval) => Promise<void>;
  existingDepths: {depthInterval: DepthInterval}[];
};

export const AddDepthModalBody = ({
  onSubmit: parentOnSubmit,
  existingDepths,
}: Props) => {
  const {t} = useTranslation();
  const onClose = useModal()!.onClose;

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
    <Formik<DepthFormInput>
      validationSchema={schema}
      initialValues={{
        label: '',
        start: '',
        end: '',
      }}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <>
          <DepthForm />
          <Box height="50px" />
          <Button
            size="lg"
            mx="auto"
            onPress={() => handleSubmit()}
            _text={{textTransform: 'uppercase'}}
            isDisabled={!isValid || isSubmitting}>
            {t('general.add')}
          </Button>
        </>
      )}
    </Formik>
  );
};
