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

import {useCallback, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik} from 'formik';
import * as yup from 'yup';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {updateSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {
  degreeToPercent,
  percentToDegree,
} from 'terraso-mobile-client/screens/SlopeScreen/utils/steepnessConversion';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectSoilData} from 'terraso-mobile-client/store/selectors';

type Props = {
  siteId: string;
  trigger: ModalTrigger;
};

type FormInput = {
  slopeSteepnessPercent: string | undefined;
  slopeSteepnessDegree: string | undefined;
};

/* For manual steepness entry */
export const ManualSteepnessOverlaySheet = ({siteId, trigger}: Props) => {
  const {t} = useTranslation();
  const modalRef = useRef<ModalHandle>(null);

  const onClose = useCallback(() => modalRef.current?.onClose(), [modalRef]);

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
    let didUpdate = false;
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
      didUpdate = true;
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
      didUpdate = true;
    } else {
      await dispatch(
        updateSoilData({
          siteId,
          slopeSteepnessPercent: null,
          slopeSteepnessDegree: null,
        }),
      );
    }
    if (didUpdate) {
      trackSoilObservation({
        input_type: 'slope_steepness',
        input_method: 'manual',
        site_id: siteId,
      });
    }
    onClose();
  };

  return (
    <InfoSheet
      ref={modalRef}
      trigger={trigger}
      heading={<TranslatedHeading i18nKey="slope.steepness.manual_help" />}>
      <Formik<FormInput>
        validationSchema={schema}
        initialValues={{
          slopeSteepnessPercent: soilData.slopeSteepnessPercent?.toString(),
          slopeSteepnessDegree: soilData.slopeSteepnessDegree?.toString(),
        }}
        onSubmit={onSubmit}
        validateOnChange>
        {({handleSubmit, isValid, isSubmitting, handleChange}) => (
          <Column>
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
            <Box height="20px" />
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
            <Box height="25px" />
            <Row justifyContent="flex-end" alignItems="center" space={5}>
              <ContainedButton
                size="lg"
                onPress={handleSubmit}
                label={t('general.save')}
                disabled={!isValid || isSubmitting}
              />
            </Row>
          </Column>
        )}
      </Formik>
    </InfoSheet>
  );
};
