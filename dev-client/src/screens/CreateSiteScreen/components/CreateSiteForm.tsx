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

import {
  FormControl,
  ScrollView,
  Spacer,
  Button,
  KeyboardAvoidingView,
} from 'native-base';
import {useMemo, useEffect} from 'react';
import {Platform} from 'react-native';
import {InferType} from 'yup';
import {useTranslation} from 'react-i18next';
import {FormikProps} from 'formik';

import {siteValidationSchema} from 'terraso-mobile-client/schemas/siteValidationSchema';
import {useSelector} from 'terraso-mobile-client/store';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {ProjectSelect} from 'terraso-mobile-client/components/ProjectSelect';
import {coordsToString} from 'terraso-mobile-client/components/StaticMapView';
import {FormRadio} from 'terraso-mobile-client/components/form/FormRadio';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {FormRadioGroup} from 'terraso-mobile-client/components/form/FormRadioGroup';
import {FormTooltip} from 'terraso-mobile-client/components/form/FormTooltip';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {FormField} from 'terraso-mobile-client/components/form/FormField';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {
  VStack,
  Box,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type FormState = Omit<
  InferType<ReturnType<typeof siteValidationSchema>>,
  'coords'
> & {
  coords: string;
};

export const CreateSiteForm = ({
  isSubmitting,
  handleSubmit,
  handleChange,
  setValues,
  values,
  sitePin,
  onInfoPress,
  isValid,
}: FormikProps<FormState> & {
  sitePin: Coords | undefined;
  onInfoPress: () => void;
}) => {
  const {t} = useTranslation();
  const {accuracyM} = useSelector(state => state.map.userLocation);
  const currentCoords = useMemo(() => sitePin, [sitePin]);

  useEffect(() => {
    if (currentCoords && values.coords !== coordsToString(currentCoords)) {
      handleChange('coords')(coordsToString(currentCoords));
    }
  }, [currentCoords, values.coords, handleChange]);

  const projectPrivacy = useSelector(state =>
    values.projectId
      ? state.project.projects[values.projectId].privacy
      : undefined,
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      flex={1}
      keyboardVerticalOffset={40}>
      <ScrollView>
        <VStack p="16px" pt="30px" space="18px">
          <FormField name="name">
            <FormLabel>{t('site.create.name_label')}</FormLabel>
            <FormInput placeholder={t('site.create.name_placeholder')} />
          </FormField>
          <FormField name="coords">
            <FormLabel>{t('site.create.location_label')}</FormLabel>
            <Text>
              {t('site.create.location_accuracy', {
                accuracyM: accuracyM?.toFixed(0),
              })}
            </Text>
            <FormInput keyboardType="decimal-pad" />
            <FormControl.Label variant="subtle">
              {t('site.create.coords_label')}
            </FormControl.Label>
          </FormField>
          <FormField name="projectId">
            <FormLabel>
              {t('site.create.add_to_project_label')}
              <FormTooltip icon="help">
                <Text color="primary.contrast" variant="body1">
                  {t('site.create.add_to_project_tooltip')}
                </Text>
              </FormTooltip>
            </FormLabel>
            <ProjectSelect
              projectId={values.projectId ?? null}
              setProjectId={projectId =>
                setValues(current => ({
                  ...current,
                  projectId: projectId ?? undefined,
                }))
              }
            />
          </FormField>
          <FormField name="privacy">
            <FormLabel>
              {t('privacy.label')}
              <IconButton
                pt={0}
                pb={0}
                pl={2}
                size="md"
                name="info"
                onPress={onInfoPress}
                _icon={{color: 'action.active_subtle'}}
              />
            </FormLabel>
            <FormRadioGroup
              values={['PUBLIC', 'PRIVATE']}
              variant="oneLine"
              value={projectPrivacy ?? values.privacy}
              renderRadio={value => (
                <FormRadio
                  key={value}
                  value={value}
                  isDisabled={projectPrivacy !== undefined}>
                  {t(`privacy.${value.toLowerCase()}.title`)}
                </FormRadio>
              )}
            />
          </FormField>
          <Spacer />
        </VStack>
      </ScrollView>
      <Box position="absolute" bottom={10} right={3} p={3}>
        <Button
          onPress={() => handleSubmit()}
          isDisabled={isSubmitting || !isValid}
          shadow={5}
          size={'lg'}
          _text={{textTransform: 'uppercase'}}>
          {t('general.save_fab')}
        </Button>
      </Box>
    </KeyboardAvoidingView>
  );
};
