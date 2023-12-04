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
  Text,
  FormControl,
  ScrollView,
  VStack,
  Spacer,
  Button,
  KeyboardAvoidingView,
  Box,
} from 'native-base';
import {useCallback, useMemo, useEffect} from 'react';
import {Platform} from 'react-native';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {siteValidationSchema} from 'terraso-mobile-client/components/sites/validation';
import {InferType} from 'yup';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'terraso-mobile-client/model/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {ProjectSelect} from 'terraso-mobile-client/components/projects/ProjectSelect';
import {
  coordsToString,
  parseCoords,
} from 'terraso-mobile-client/components/common/Map';
import {Formik, FormikProps} from 'formik';
import {
  FormField,
  FormInput,
  FormRadio,
  FormRadioGroup,
  FormLabel,
  FormTooltip,
} from 'terraso-mobile-client/components/common/Form';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';

type FormState = Omit<
  InferType<ReturnType<typeof siteValidationSchema>>,
  'coords'
> & {
  coords: string;
};

const CreateSiteForm = ({
  isSubmitting,
  handleSubmit,
  handleChange,
  setValues,
  values,
  sitePin,
  onInfoPress,
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
                accuracyM: accuracyM.toFixed(5),
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
              projectId={values.projectId}
              setProjectId={projectId =>
                setValues(current => ({...current, projectId}))
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
                _icon={{color: 'action.active'}}
              />
            </FormLabel>
            <FormRadioGroup
              values={['PUBLIC', 'PRIVATE']}
              variant="oneLine"
              value={projectPrivacy ?? values.privacy}
              renderRadio={value => (
                <FormRadio
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
          disabled={isSubmitting}
          shadow={5}
          size={'lg'}
          _text={{textTransform: 'uppercase'}}>
          {t('general.save_fab')}
        </Button>
      </Box>
    </KeyboardAvoidingView>
  );
};

type Props = {
  defaultProjectId?: string;
  sitePin?: Coords;
  createSiteCallback: (
    input: SiteAddMutationInput,
  ) => Promise<Site | undefined>;
  onInfoPress: () => void;
};

export const CreateSiteView = ({
  defaultProjectId,
  createSiteCallback,
  sitePin,
  onInfoPress,
}: Props) => {
  const {t} = useTranslation();
  const validationSchema = useMemo(() => siteValidationSchema(t), [t]);
  const userLocation = useSelector(state => state.map.userLocation);
  const defaultProject = useSelector(state =>
    defaultProjectId ? state.project.projects[defaultProjectId] : undefined,
  );

  const defaultCoords = userLocation.coords;

  const navigation = useNavigation();

  const onSave = useCallback(
    async ({...form}: FormState) => {
      const {coords, ...site} = validationSchema.cast(form);
      const createdSite = await createSiteCallback({
        ...site,
        ...parseCoords(coords),
      });
      if (createdSite !== undefined) {
        navigation.replace('HOME', {
          site: createdSite,
        });
      }
    },
    [createSiteCallback, navigation, validationSchema],
  );

  return (
    <Formik<FormState>
      onSubmit={onSave}
      validationSchema={validationSchema}
      initialValues={{
        name: '',
        coords: defaultCoords ? coordsToString(defaultCoords) : '',
        projectId: defaultProject?.id,
        privacy: defaultProject?.privacy ?? 'PUBLIC',
      }}>
      {props => (
        <CreateSiteForm
          {...props}
          sitePin={sitePin}
          onInfoPress={onInfoPress}
        />
      )}
    </Formik>
  );
};
