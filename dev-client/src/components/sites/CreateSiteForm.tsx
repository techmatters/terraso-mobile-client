import {Text, Fab, FormControl, VStack} from 'native-base';
import {useMemo, useEffect} from 'react';
import {siteValidationSchema} from 'terraso-mobile-client/components/sites/validation';
import {InferType} from 'yup';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'terraso-mobile-client/model/store';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {ProjectSelect} from 'terraso-mobile-client/components/projects/ProjectSelect';
import {coordsToString} from 'terraso-mobile-client/components/common/Map';
import {FormikProps} from 'formik';
import {
  FormField,
  FormInput,
  FormRadio,
  FormRadioGroup,
  FormLabel,
  FormTooltip,
} from 'terraso-mobile-client/components/common/Form';

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
}: FormikProps<FormState> & {sitePin: Coords | undefined}) => {
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
    <VStack p="16px" pt="30px" space="18px">
      <FormField name="name">
        <FormLabel>{t('site.create.name_label')}</FormLabel>
        <FormInput placeholder={t('site.create.name_placeholder')} />
      </FormField>
      <FormField name="coords">
        <FormLabel>{t('site.create.location_label')}</FormLabel>
        <Text>
          {t('site.create.location_accuracy', {accuracyM: accuracyM})}
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
          <FormTooltip icon="help">
            <Text color="primary.contrast" variant="body1">
              {t('site.create.privacy_tooltip')}
              <Text underline color="primary.lightest">
                {t('site.create.privacy_tooltip_link')}
              </Text>
            </Text>
          </FormTooltip>
        </FormLabel>
        <FormRadioGroup
          values={['PUBLIC', 'PRIVATE']}
          variant="oneLine"
          value={projectPrivacy ?? values.privacy}
          renderRadio={value => (
            <FormRadio value={value} isDisabled={projectPrivacy !== undefined}>
              {t(`privacy.${value}.title`)}
            </FormRadio>
          )}
        />
      </FormField>
      <Fab
        label={t('general.save_fab')}
        onPress={() => handleSubmit()}
        disabled={isSubmitting}
      />
    </VStack>
  );
};
