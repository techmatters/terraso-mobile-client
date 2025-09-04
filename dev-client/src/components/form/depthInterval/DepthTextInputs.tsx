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
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {DEPTH_LABEL_MAX_LENGTH} from 'terraso-mobile-client/constants';

export type DepthFormInput = {
  label: string;
  start: string;
  end: string;
};

const VerticalSpacer = () => <Box marginTop="20px" />;

export const DepthTextInputs = () => {
  const {t} = useTranslation();
  const {value: label} = useFieldContext('label');
  return (
    <>
      <FormControl>
        <FormInput
          name="label"
          placeholder={t('soil.depth.label_placeholder')}
          textInputLabel={t('soil.depth.label_placeholder')}
          maxLength={DEPTH_LABEL_MAX_LENGTH}
        />
        <FormControl.HelperText>
          {t('general.character_limit', {
            current: label?.length ?? 0,
            limit: DEPTH_LABEL_MAX_LENGTH,
          })}
        </FormControl.HelperText>
      </FormControl>
      <VerticalSpacer />
      <Box flex={1}>
        <FormInput
          name="start"
          keyboardType="numeric"
          placeholder={t('soil.depth.start_label', {
            units: 'cm',
          })}
          textInputLabel={t('soil.depth.start_label', {
            units: 'cm',
          })}
        />
      </Box>
      <VerticalSpacer />
      <Box flex={1}>
        <FormInput
          name="end"
          keyboardType="numeric"
          placeholder={t('soil.depth.end_label', {
            units: 'cm',
          })}
          textInputLabel={t('soil.depth.end_label', {
            units: 'cm',
          })}
        />
      </Box>
      <Box height="10px" />
    </>
  );
};
