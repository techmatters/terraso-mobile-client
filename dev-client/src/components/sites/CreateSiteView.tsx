import RadioBlock from '../common/RadioBlock';
import {Fab, FormControl, Input, ScrollView, Text, VStack} from 'native-base';
import {useCallback, useMemo, useState, useEffect} from 'react';
import {
  ProjectPrivacy,
  SiteAddMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {useNavigation} from '../../screens/AppScaffold';
import {siteValidationSchema} from './validation';
import {ValidationError} from 'yup';
import {Icon} from '../common/Icons';
import {useTranslation} from 'react-i18next';
import {useSelector} from '../../model/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Coords} from '../../model/map/mapSlice';
import {ProjectSelect} from '../projects/ProjectSelect';

type LatLongString = {latitude: string; longitude: string};

function fromLocation(coords: Coords): LatLongString {
  return {
    longitude: String(coords.longitude),
    latitude: String(coords.latitude),
  };
}

type Props = {
  defaultProject?: string;
  sitePin?: Coords;
  createSiteCallback?: (
    input: SiteAddMutationInput,
  ) => Promise<Site | undefined>;
};

type Args = Partial<
  Omit<Record<keyof SiteAddMutationInput, string>, 'clientMutationId'> & {
    privacy: ProjectPrivacy;
  }
>;

type Error = Partial<
  Omit<Record<keyof SiteAddMutationInput, string[]>, 'clientMutationId'>
>;

type LocationInputOptions = 'coords' | 'gps' | 'pin';

export default function CreateSiteView({
  defaultProject,
  createSiteCallback,
  sitePin,
}: Props) {
  const {t} = useTranslation();

  const userLocation = useSelector(state => state.map.userLocation);
  const projectMap = useSelector(state => state.project.projects);
  const [submitting, setSubmitting] = useState(false);

  const {latitude: defaultLat, longitude: defaultLon} = useMemo(
    () => sitePin ?? userLocation ?? {latitude: '0', longitude: '0'},
    [userLocation, sitePin],
  );

  const [locationSource, setLocationSource] = useState<LocationInputOptions>(
    sitePin ? 'pin' : userLocation ? 'gps' : 'coords',
  );

  /** We store the form state in mutationInput */
  const [mutationInput, setMutationInput] = useState<Args>({
    latitude: String(defaultLat),
    longitude: String(defaultLon),
    projectId: defaultProject ? projectMap[defaultProject]?.id : undefined,
    privacy: defaultProject ? projectMap[defaultProject].privacy : 'PRIVATE',
  });

  const [errors, setErrors] = useState<Error>({});

  const navigation = useNavigation();

  /**
   * Checks the form status with the yup library, and posts to backend
   */
  const onSave = useCallback(async () => {
    setSubmitting(true);
    if (createSiteCallback === undefined) {
      return;
    }

    let validationResults;

    try {
      validationResults = await siteValidationSchema.validate(mutationInput);
    } catch (validationError) {
      setSubmitting(false);
      if (validationError instanceof ValidationError) {
        setErrors({
          [validationError.path as keyof SiteAddMutationInput]:
            validationError.errors,
        });
        return;
      } else {
        throw validationError;
      }
    }
    const {name, latitude, longitude, projectId} = validationResults;
    const createdSite = await createSiteCallback({
      name,
      latitude,
      longitude,
      projectId,
    });
    if (createdSite !== undefined) {
      navigation.replace('LOCATION_DASHBOARD', {siteId: createdSite.id});
    }
    setSubmitting(false);
  }, [mutationInput, createSiteCallback, navigation]);

  /* calculates the associated location for a given location input option
   * For example, for 'pin', it grabs and formats the value from the sitepin */
  const locationOptions = useMemo(() => {
    const options: Record<LocationInputOptions, LatLongString | null> = {
      coords: {latitude: '', longitude: ''},
      gps: userLocation && fromLocation(userLocation),
      pin: (sitePin && fromLocation(sitePin)) ?? null,
    };
    return options;
  }, [userLocation, sitePin]);

  useEffect(() => {
    if (userLocation !== null && locationSource === 'gps') {
      setMutationInput(input => ({...input, ...locationOptions.gps}));
    }
  }, [userLocation, setMutationInput, locationSource, locationOptions]);

  /** Callback passed to RadioBlock to update the value of the location input */
  const updateLocationSource = useCallback(
    (key: LocationInputOptions) => {
      setLocationSource(key);
      const newLocation = locationOptions[key];
      if (newLocation === undefined) {
        console.error(
          `Trying to change location source ${key} , but no location associated`,
        );
        return;
      }
      setMutationInput(current => ({
        ...current,
        ...newLocation,
      }));
    },
    [locationOptions],
  );

  return (
    <ScrollView>
      <VStack p={5} space={3}>
        <FormControl>
          <Input
            placeholder={t('site.create.name_placeholder')}
            value={mutationInput.name}
            onChangeText={name =>
              setMutationInput(current => ({...current, name}))
            }
          />
          {/* TODO: FormControl.ErrorMessage does not seem to work :( */}
          {errors.name &&
            errors.name.map(msg => (
              <Text color="error.main" key={msg}>
                {msg}
              </Text>
            ))}
        </FormControl>
        <RadioBlock<LocationInputOptions>
          label={t('site.create.location_label')}
          options={{
            gps: {text: t('site.create.gps')},
            pin: {
              text: t('site.create.pin'),
              isDisabled: sitePin === undefined,
            },
            coords: {text: t('site.create.coords')},
          }}
          groupProps={{
            name: 'location',
            value: locationSource,
            onChange: updateLocationSource,
          }}
        />
        <FormControl>
          <FormControl.Label>Latitude</FormControl.Label>
          <Input
            variant="underlined"
            keyboardType="numeric"
            size="sm"
            onChangeText={latitude =>
              setMutationInput(current => ({...current, latitude}))
            }
            value={mutationInput.latitude}
            leftElement={<Icon mr={2} name="edit" />}
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Longitude</FormControl.Label>
          <Input
            size="sm"
            variant="underlined"
            keyboardType="numeric"
            value={mutationInput.longitude}
            onChangeText={longitude =>
              setMutationInput(current => ({...current, longitude}))
            }
            leftElement={<Icon mr={2} name="edit" />}
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Add to Project</FormControl.Label>
          <ProjectSelect
            projectId={mutationInput.projectId}
            setProjectId={projectId =>
              setMutationInput(current => ({...current, projectId}))
            }
          />
        </FormControl>
        <RadioBlock<ProjectPrivacy>
          label="Data Privacy"
          options={{
            PUBLIC: {text: 'Public'},
            PRIVATE: {text: 'Private'},
          }}
          allDisabled={mutationInput.projectId ? true : undefined}
          groupProps={{
            variant: 'oneLine',
            name: 'data-privacy',
            value: mutationInput.privacy,
            onChange: (privacy: ProjectPrivacy) =>
              setMutationInput(current => ({
                ...current,
                privacy,
              })),
          }}
        />
        <Fab
          label={t('general.save_fab')}
          onPress={onSave}
          disabled={submitting}
        />
      </VStack>
    </ScrollView>
  );
}
