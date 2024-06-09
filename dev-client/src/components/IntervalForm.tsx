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

import {useTranslation} from 'react-i18next';

import {FormControl} from 'native-base';

import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {Box, Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {FORM_LABEL_MAX} from 'terraso-mobile-client/constants';

export type IntervalFormInput = {
  label: string;
  start: string;
  end: string;
};

export const IntervalForm = () => {
  const {t} = useTranslation();
  const {value: label} = useFieldContext('label');
  return (
    <>
      <FormControl>
        <FormInput
          name="label"
          placeholder={t('soil.depth_interval.label_placeholder')}
          maxLength={FORM_LABEL_MAX}
        />
        <FormControl.HelperText>
          {t('general.character_limit', {
            current: label?.length ?? 0,
            limit: FORM_LABEL_MAX,
          })}
        </FormControl.HelperText>
      </FormControl>
      <Row justifyContent="space-between" space="40px" pt="20px">
        <Box flex={1}>
          <FormInput
            name="start"
            placeholder={t('soil.depth_interval.start_label', {
              units: 'cm',
            })}
          />
        </Box>
        <Box flex={1}>
          <FormInput
            name="end"
            placeholder={t('soil.depth_interval.end_label', {
              units: 'cm',
            })}
          />
        </Box>
      </Row>
    </>
  );
};
