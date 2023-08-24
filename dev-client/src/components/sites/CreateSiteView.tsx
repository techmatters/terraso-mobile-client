import {Location} from '@rnmapbox/maps';
import RadioBlock from '../common/RadioBlock';
import {
  Fab,
  FormControl,
  Input,
  ScrollView,
  Select,
  Text,
  VStack,
} from 'native-base';
import {useCallback, useMemo, useState} from 'react';
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

type LatLongString = {latitude: string; longitude: string};

function fromLocation(coords: Coords): LatLongString {
  return {
    longitude: String(coords.longitude),
    latitude: String(coords.latitude),
  };
}

type Props = {
  defaultProject?: string;
  userLocation?: Location;
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
  userLocation,
  createSiteCallback,
  sitePin,
}: Props) {
  const {t} = useTranslation();

  const projectMap = useSelector(state => state.project.projects);
  const projects = useMemo(() => Object.values(projectMap), [projectMap]);

  const {latitude: defaultLat, longitude: defaultLon} = useMemo(() => {
    if (sitePin) {
      return sitePin;
    }
    if (userLocation) {
      return {...userLocation.coords};
    }
    return {latitude: '0', longitude: '0'};
  }, [userLocation, sitePin]);

  /** We store the form state in mutationInput */
  const [mutationInput, setMutationInput] = useState<Args>({
    latitude: String(defaultLat),
    longitude: String(defaultLon),
    projectId: defaultProject ? projectMap[defaultProject]?.id : undefined,
    privacy: defaultProject ? projectMap[defaultProject].privacy : 'PRIVATE',
  });

  const [errors, setErrors] = useState<Error>({});

  const {reset} = useNavigation();

  /**
   * Checks the form status with the yup library, and posts to backend
   */
  const onSave = useCallback(async () => {
    if (createSiteCallback === undefined) {
      return;
    }

    let validationResults;

    try {
      validationResults = await siteValidationSchema.validate(mutationInput);
    } catch (validationError) {
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
      reset({
        routes: [
          {name: 'HOME'},
          {name: 'LOCATION_DASHBOARD', params: {siteId: createdSite.id}},
        ],
      });
    }
  }, [mutationInput, createSiteCallback, reset]);

  /* calculates the associated location for a given location input option
   * For example, for 'pin', it grabs and formats the value from the sitepin */
  const locationOptions = useMemo(() => {
    const options: Record<LocationInputOptions, LatLongString | undefined> = {
      coords: {latitude: '', longitude: ''},
      gps: userLocation && fromLocation(userLocation.coords),
      pin: sitePin && fromLocation(sitePin),
    };
    return options;
  }, [userLocation, sitePin]);

  /** Callback passed to RadioBlock to update the value of the location input */
  const updateLocationSource = useCallback(
    (key: LocationInputOptions) => {
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

  const defaultLocationSource = useMemo(() => {
    if (sitePin) {
      return 'pin';
    }
    if (userLocation) {
      return 'gps';
    }
    return 'coords';
  }, [sitePin, userLocation]);

  return (
    <ScrollView>
      <VStack p={5} space={3}>
        <FormControl>
          <Input
            placeholder="Site name"
            value={mutationInput.name}
            onChangeText={name => setMutationInput({...mutationInput, name})}
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
          label="Site Location"
          options={{
            gps: {text: 'Use my current location (GPS)'},
            pin: {
              text: 'Use map pin',
              isDisabled: sitePin === undefined,
            },
            coords: {text: 'Enter coordinates'},
          }}
          groupProps={{
            name: 'location',
            defaultValue: defaultLocationSource,
            onChange: updateLocationSource,
          }}
        />
        <FormControl>
          <FormControl.Label>Latitude</FormControl.Label>
          <Input
            variant="underlined"
            size="sm"
            onChangeText={latitude =>
              setMutationInput({...mutationInput, latitude})
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
            value={mutationInput.longitude}
            onChangeText={longitude =>
              setMutationInput({...mutationInput, longitude})
            }
            leftElement={<Icon mr={2} name="edit" />}
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Add to Project</FormControl.Label>
          <Select
            selectedValue={mutationInput.projectId}
            onValueChange={projectId =>
              setMutationInput({...mutationInput, projectId})
            }>
            {projects.map(project => (
              <Select.Item
                label={project.name}
                value={project.id}
                key={project.id}
              />
            ))}
          </Select>
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
              setMutationInput({
                ...mutationInput,
                privacy,
              }),
          }}
        />
        <Fab label={t('general.save_fab')} onPress={onSave} />
      </VStack>
    </ScrollView>
  );
}
