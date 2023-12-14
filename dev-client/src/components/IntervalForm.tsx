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
import {Box, Row} from 'native-base';

export type IntervalFormInput = {
  label: string;
  start: string;
  end: string;
};

type Props = {
  hideLabel?: boolean;
  disableDepth?: boolean;
};

export const IntervalForm = ({
  hideLabel = false,
  disableDepth = false,
}: Props) => {
  const {t} = useTranslation();
  return (
    <>
      {!hideLabel && (
        <>
          <FormInput
            name="label"
            helpText={t('soil.depth_interval.label_help', {
              max: FORM_LABEL_MAX,
            })}
            variant="underlined"
            isReadOnly={hideLabel}
          />
          <Box height="20px" />
        </>
      )}
      <Row justifyContent="space-between" space="40px">
        <Box flex={1}>
          <FormInput
            name="start"
            variant="underlined"
            label={t('soil.depth_interval.start_label', {
              unit: 'cm',
            })}
            isReadOnly={disableDepth}
            inputMode="numeric"
          />
        </Box>
        <Box flex={1}>
          <FormInput
            name="end"
            variant="underlined"
            label={t('soil.depth_interval.end_label', {
              unit: 'cm',
            })}
            isReadOnly={disableDepth}
            inputMode="numeric"
          />
        </Box>
      </Row>
    </>
  );
};
