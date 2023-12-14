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

import {Box, Button, Column, Row, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useModal} from 'terraso-mobile-client/components/Modal';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import * as yup from 'yup';
import {useMemo} from 'react';
import {Formik} from 'formik';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';

type Props = {
  siteId: string;
};

type FormInput = {
  slopeSteepnessPercent: string | undefined;
  slopeSteepnessDegree: string | undefined;
};

export const ManualSteepnessModal = ({siteId}: Props) => {
  const {t} = useTranslation();
  const onClose = useModal()!.onClose;
  const soilData = useSelector(state => state.soilId.soilData[siteId]);
  const dispatch = useDispatch();

  const schema = useMemo(
    () =>
      yup.object({
        slopeSteepnessPercent: yup
          .number()
          .nullable()
          .optional()
          .typeError(t('slope.steepness.percentage_help'))
          .min(0, t('slope.steepness.percentage_help')),
        slopeSteepnessDegree: yup
          .number()
          .nullable()
          .optional()
          .typeError(t('slope.steepness.percentage_help'))
          .min(0, t('slope.steepness.degree_help'))
          .max(90, t('slope.steepness.degree_help')),
      }),
    [t],
  );

  const onSubmit = async ({
    slopeSteepnessPercent,
    slopeSteepnessDegree,
  }: FormInput) => {
    if (slopeSteepnessPercent) {
      await dispatch(
        updateSoilData({
          siteId,
          slopeSteepnessSelect: null,
          slopeSteepnessPercent: parseInt(slopeSteepnessPercent, 10),
          slopeSteepnessDegree: null,
        }),
      );
    } else if (slopeSteepnessDegree) {
      await dispatch(
        updateSoilData({
          siteId,
          slopeSteepnessSelect: null,
          slopeSteepnessPercent: null,
          slopeSteepnessDegree: parseInt(slopeSteepnessDegree, 10),
        }),
      );
    } else {
      await dispatch(
        updateSoilData({
          siteId,
          slopeSteepnessPercent: null,
          slopeSteepnessDegree: null,
        }),
      );
    }
    onClose();
  };

  return (
    <Formik<FormInput>
      validationSchema={schema}
      initialValues={{
        slopeSteepnessPercent: soilData.slopeSteepnessPercent?.toString(),
        slopeSteepnessDegree: soilData.slopeSteepnessDegree?.toString(),
      }}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <Column alignItems="center">
          <Text variant="body1" alignSelf="flex-start">
            {t('slope.steepness.manual_help')}
          </Text>
          <Box height="30px" />
          <Row justifyContent="space-between" space="40px">
            <Box flex={1}>
              <FormInput
                keyboardType="numeric"
                name="slopeSteepnessPercent"
                variant="underlined"
                helpText={t('slope.steepness.percentage_help')}
                placeholder={t('slope.steepness.percentage_placeholder')}
              />
            </Box>
            <Box flex={1}>
              <FormInput
                keyboardType="numeric"
                name="slopeSteepnessDegree"
                variant="underlined"
                helpText={t('slope.steepness.degree_help')}
                placeholder={t('slope.steepness.degree_placeholder')}
              />
            </Box>
          </Row>
          <Box height="25px" />
          <Button
            _text={{textTransform: 'uppercase'}}
            size="lg"
            isDisabled={!isValid || isSubmitting}
            onPress={() => handleSubmit()}>
            {t('general.done_fab')}
          </Button>
        </Column>
      )}
    </Formik>
  );
};
