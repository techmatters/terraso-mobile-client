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
  IntervalForm,
  IntervalFormInput,
} from 'terraso-mobile-client/components/IntervalForm';
import {useModal} from 'terraso-mobile-client/components/modals/Modal';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {intervalSchema} from 'terraso-mobile-client/schemas/intervalSchema';

type Props = {
  onSubmit: (_: LabelledDepthInterval) => Promise<void>;
  existingIntervals: {depthInterval: DepthInterval}[];
};

export const AddIntervalModalBody = ({
  onSubmit: parentOnSubmit,
  existingIntervals,
}: Props) => {
  const {t} = useTranslation();
  const onClose = useModal()!.onClose;

  const schema = useMemo(
    () => intervalSchema({t, existingIntervals}),
    [t, existingIntervals],
  );

  const onSubmit = async (values: IntervalFormInput) => {
    const {label, ...depthInterval} = schema.cast(values);
    await parentOnSubmit({label: label ?? '', depthInterval});
    onClose();
  };

  return (
    <Formik<IntervalFormInput>
      validationSchema={schema}
      initialValues={{
        label: '',
        start: '',
        end: '',
      }}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <>
          <IntervalForm />
          <Box height="50px" />
          <Button
            size="lg"
            mx="auto"
            onPress={() => handleSubmit()}
            isDisabled={!isValid || isSubmitting}>
            {t('general.add')}
          </Button>
        </>
      )}
    </Formik>
  );
};
