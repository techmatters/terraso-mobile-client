/*
 * Copyright © 2025 Technology Matters
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

import React, {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {SiteDepthFormInput} from 'terraso-mobile-client/components/form/depthInterval/depthOverlaySheetHelpers';
import {FormCheckbox} from 'terraso-mobile-client/components/form/FormCheckbox';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {FormSwitch} from 'terraso-mobile-client/components/form/FormSwitch';
import {
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  methodEnabled,
  SoilPitMethod,
  soilPitMethods,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {
  SWITCH_PADDING,
  SWITCH_VERTICAL_PADDING,
  theme,
} from 'terraso-mobile-client/theme';

type SoilMethodTogglesProps = {
  requiredInputs: SoilPitMethod[];
};

export const EnabledInputToggles = ({
  requiredInputs,
}: SoilMethodTogglesProps) => {
  const {t, i18n} = useTranslation();

  return (
    <>
      <Heading variant="h6" mt="11px" mb="11px">
        {t('soil.depth.data_inputs_title')}
      </Heading>
      <Column space="10px" mb="12px">
        {soilPitMethods.map(method => {
          const descriptionExists = i18n.exists(
            `soil.collection_method_description.${method}`,
          );
          const description = descriptionExists
            ? t(`soil.collection_method_description.${method}`)
            : '';

          return (
            <React.Fragment key={method}>
              <InputFormSwitch
                method={method}
                isRequired={requiredInputs.includes(method)}
                key={method}
              />
              {description && (
                <Text mb={SWITCH_VERTICAL_PADDING} variant="body2">
                  {description}
                </Text>
              )}
            </React.Fragment>
          );
        })}
      </Column>
      <Row mb="12px">
        <FormCheckbox name="applyToAll" />
        <FormLabel variant="body1" ml={SWITCH_PADDING}>
          {t('soil.depth.apply_to_all_label')}
        </FormLabel>
      </Row>
    </>
  );
};

type InputFormSwitchProps = {
  method: SoilPitMethod;
  isRequired: boolean;
};

const InputFormSwitch = ({method, isRequired}: InputFormSwitchProps) => {
  const {t} = useTranslation();

  const label = useMemo(() => {
    const methodDescriber = t(`soil.collection_method.${method}`);
    return isRequired
      ? t('soil.required_method', {method: methodDescriber})
      : methodDescriber;
  }, [t, method, isRequired]);

  return (
    <Row alignItems="center">
      <FormSwitch<SiteDepthFormInput>
        name={methodEnabled(method)}
        disabled={isRequired}
        accessibilityLabel={label}
        // Mirrors the Formik field name so tests select by field rather than by translated label.
        testID={`${methodEnabled(method)}-switch`}
      />
      <Text
        ml={SWITCH_PADDING}
        color={
          isRequired ? theme.colors.text.disabled : theme.colors.text.primary
        }>
        {label}
      </Text>
    </Row>
  );
};
