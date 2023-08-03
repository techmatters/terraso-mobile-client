import {Location} from '@rnmapbox/maps';
import {ProjectName} from '../../types';
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
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {useNavigation} from '../../screens/AppScaffold';
import {siteValidationSchema} from './validation';
import {ValidationError} from 'yup';
import {Icon} from '../common/Icons';
import {useTranslation} from 'react-i18next';

type LatLongString = {latitude: string; longitude: string};

function fromLocation(location: Location): LatLongString {
  return {
    longitude: String(location.coords.longitude),
    latitude: String(location.coords.latitude),
  };
}

type Props = {
  defaultProject?: string;
  projects: ProjectName[];
  userLocation?: Location;
  sitePin?: Location;
  createSiteCallback?: (input: SiteAddMutationInput) => void;
};

type Args = Partial<
  Omit<Record<keyof SiteAddMutationInput, string>, 'clientMutationId'>
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
  projects,
}: Props) {
  const {t} = useTranslation();

  /** We store the form state in mutationInput */
  const [mutationInput, setMutationInput] = useState<Args>({
    latitude: userLocation && String(userLocation.coords.latitude),
    longitude: userLocation && String(userLocation.coords.longitude),
    projectId: defaultProject,
  });

  const [errors, setErrors] = useState<Error>({});

  const {navigate, goBack} = useNavigation();

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
    createSiteCallback({name, latitude, longitude, projectId});
    if (defaultProject) {
      goBack();
      return;
    }
    navigate('HOME');
  }, [mutationInput, createSiteCallback, navigate, defaultProject]);

  /* calculates the associated location for a given location input option
   * For example, for 'pin', it grabs and formats the value from the sitepin */
  const locationOptions = useMemo(() => {
    const options: Record<LocationInputOptions, LatLongString | undefined> = {
      coords: {latitude: '', longitude: ''},
      gps: userLocation && fromLocation(userLocation),
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
      setMutationInput({
        ...mutationInput,
        ...newLocation,
      });
    },
    [locationOptions, mutationInput],
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
        <RadioBlock<'public' | 'private'>
          label="Data Privacy"
          options={{
            public: {text: 'Public'},
            private: {text: 'Private'},
          }}
          groupProps={{
            variant: 'oneLine',
            name: 'data-privacy',
            defaultValue: 'private',
          }}
        />
        <Fab label={t('general.save_fab')} onPress={onSave} />
      </VStack>
    </ScrollView>
  );
}
