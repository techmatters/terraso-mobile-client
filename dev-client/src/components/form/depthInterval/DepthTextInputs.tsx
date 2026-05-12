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

import {FormTextField} from 'terraso-mobile-client/components/form/FormTextField';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {DEPTH_LABEL_MAX_LENGTH} from 'terraso-mobile-client/constants';

export type DepthTextFormInput = {
  label: string;
  start: string;
  end: string;
};

const VerticalSpacer = () => <Box marginTop="20px" />;

export const DepthTextForm = () => {
  const {t} = useTranslation();
  return (
    <>
      <FormTextField<DepthTextFormInput>
        name="label"
        placeholder={t('soil.depth.label_placeholder')}
        label={t('soil.depth.label_placeholder')}
        maxLength={DEPTH_LABEL_MAX_LENGTH}
        showCounter
      />
      <VerticalSpacer />
      <Box flex={1}>
        <FormTextField<DepthTextFormInput>
          name="start"
          type="numeric"
          placeholder={t('soil.depth.start_label', {
            units: 'cm',
          })}
          label={t('soil.depth.start_label', {
            units: 'cm',
          })}
        />
      </Box>
      <VerticalSpacer />
      <Box flex={1}>
        <FormTextField<DepthTextFormInput>
          name="end"
          type="numeric"
          placeholder={t('soil.depth.end_label', {
            units: 'cm',
          })}
          label={t('soil.depth.end_label', {
            units: 'cm',
          })}
        />
      </Box>
      <Box height="10px" />
    </>
  );
};
