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

import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik} from 'formik';
import {Button} from 'native-base';
import * as yup from 'yup';

import {selectSoilData} from 'terraso-client-shared/selectors';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';

import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {useModal} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  degreeToPercent,
  percentToDegree,
} from 'terraso-mobile-client/screens/SlopeScreen/utils/steepnessConversion';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

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
  const soilData = useSelector(selectSoilData(siteId));
  const dispatch = useDispatch();
  const [lastTouched, setLastTouched] = useState<keyof FormInput | null>(null);

  const schema = useMemo(
    () =>
      yup.object({
        slopeSteepnessPercent: yup
          .number()
          .nullable()
          .optional()
          .typeError(t('slope.steepness.percentage_help'))
          .min(0, t('slope.steepness.percentage_help'))
          .max(999, t('slope.steepness.percentage_help')),
        slopeSteepnessDegree: yup
          .number()
          .nullable()
          .optional()
          .typeError(t('slope.steepness.percentage_help'))
          .min(0, t('slope.steepness.degree_help'))
          .max(89, t('slope.steepness.degree_help')),
      }),
    [t],
  );

  const onSubmit = async ({
    slopeSteepnessPercent,
    slopeSteepnessDegree,
  }: FormInput) => {
    if (
      slopeSteepnessPercent &&
      (lastTouched === 'slopeSteepnessPercent' || !slopeSteepnessDegree)
    ) {
      await dispatch(
        updateSoilData({
          siteId,
          slopeSteepnessSelect: null,
          slopeSteepnessPercent: parseInt(slopeSteepnessPercent, 10),
          slopeSteepnessDegree: null,
        }),
      );
    } else if (
      slopeSteepnessDegree &&
      (lastTouched === 'slopeSteepnessDegree' || !slopeSteepnessPercent)
    ) {
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
      onSubmit={onSubmit}
      validateOnChange>
      {({handleSubmit, isValid, isSubmitting, handleChange}) => (
        <Column alignItems="center">
          <Heading variant="h6" alignSelf="flex-start">
            {t('slope.steepness.manual_help')}
          </Heading>
          <Box height="30px" />
          <Row justifyContent="space-between" space="40px">
            <Box flex={1}>
              <FormInput
                keyboardType="numeric"
                name="slopeSteepnessPercent"
                helpText={t('slope.steepness.percentage_help')}
                placeholder={t('slope.steepness.percentage_placeholder')}
                textInputLabel={t('slope.steepness.percentage_placeholder')}
                maxLength={3}
                onChangeText={text => {
                  handleChange('slopeSteepnessPercent')(text);
                  setLastTouched('slopeSteepnessPercent');
                  if (text === '') {
                    handleChange('slopeSteepnessDegree')('');
                  } else if (
                    (
                      yup.reach(
                        schema,
                        'slopeSteepnessPercent',
                      ) as yup.Schema<number>
                    ).isValidSync(text)
                  ) {
                    handleChange('slopeSteepnessDegree')(
                      percentToDegree(parseInt(text, 10)).toString(),
                    );
                  }
                }}
              />
            </Box>
            <Box flex={1}>
              <FormInput
                keyboardType="numeric"
                name="slopeSteepnessDegree"
                helpText={t('slope.steepness.degree_help')}
                placeholder={t('slope.steepness.degree_placeholder')}
                textInputLabel={t('slope.steepness.degree_placeholder')}
                maxLength={2}
                onChangeText={text => {
                  handleChange('slopeSteepnessDegree')(text);
                  setLastTouched('slopeSteepnessDegree');
                  if (text === '') {
                    handleChange('slopeSteepnessPercent')('');
                  } else if (
                    (
                      yup.reach(
                        schema,
                        'slopeSteepnessDegree',
                      ) as yup.Schema<number>
                    ).isValidSync(text)
                  ) {
                    handleChange('slopeSteepnessPercent')(
                      degreeToPercent(parseInt(text, 10)).toString(),
                    );
                  }
                }}
              />
            </Box>
          </Row>
          <Box height="25px" />
          <Button
            leftIcon={<Icon name="check" />}
            _text={{textTransform: 'uppercase'}}
            size="lg"
            isDisabled={!isValid || isSubmitting}
            onPress={() => handleSubmit()}>
            {t('general.done')}
          </Button>
        </Column>
      )}
    </Formik>
  );
};
