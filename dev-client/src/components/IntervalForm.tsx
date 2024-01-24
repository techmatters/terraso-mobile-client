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

import {FORM_LABEL_MAX} from 'terraso-mobile-client/constants';
import {useTranslation} from 'react-i18next';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {Box, FormControl, Row} from 'native-base';
import {useFieldContext} from './form/hooks/useFieldContext';
import {useMemo} from 'react';

export type IntervalFormInput = {
  label: string;
  start: string;
  end: string;
};

export const IntervalForm = ({
  editable,
  displayLabel,
  labelMaxChars = FORM_LABEL_MAX,
}: {
  editable: boolean;
  displayLabel: boolean;
  labelMaxChars?: number;
}) => {
  const {t} = useTranslation();
  const {value: labelContent} = useFieldContext('label');
  const labelLength = useMemo(
    () => (labelContent ? labelContent.length : 0),
    [labelContent],
  );
  return (
    <>
      {displayLabel && (
        <FormControl>
          <FormInput
            name="label"
            placeholder={t('soil.depth_interval.label_placeholder')}
            variant="underlined"
            maxLength={labelMaxChars}
            isDisabled={!editable}
          />
          <FormControl.HelperText>
            {t('general.character_limit', {
              current: labelLength,
              limit: labelMaxChars,
            })}
          </FormControl.HelperText>
        </FormControl>
      )}
      <Row justifyContent="space-between" space="40px">
        <Box flex={1}>
          <FormInput
            name="start"
            variant="underlined"
            placeholder={t('soil.depth_interval.start_label', {
              unit: 'cm',
            })}
            isDisabled={!editable}
          />
        </Box>
        <Box flex={1}>
          <FormInput
            name="end"
            variant="underlined"
            placeholder={t('soil.depth_interval.end_label', {
              unit: 'cm',
            })}
            isDisabled={!editable}
          />
        </Box>
      </Row>
    </>
  );
};
