import {Location} from '@rnmapbox/maps';
import {ProjectName} from '../../types';
import RadioBlock from '../common/RadioBlock';
import {Fab, FormControl, Icon, Input, Text, VStack} from 'native-base';
import {useCallback, useMemo, useState} from 'react';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {useNavigation} from '@react-navigation/native';
import {TopLevelNavigationProp} from '../../screens';
import {ScreenRoutes} from '../../screens/constants';
import {siteValidationSchema} from './validation';
import {ValidationError} from 'yup';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type LatLongString = {latitude: string; longitude: string};

function fromLocation(location: Location): LatLongString {
  return {
    longitude: String(location.coords.longitude),
    latitude: String(location.coords.latitude),
  };
}

type Props = {
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

export default function CreateSiteView({
  userLocation,
  createSiteCallback,
  sitePin,
}: Props) {
  const [mutationInput, setMutationInput] = useState<Args>({
    latitude: userLocation && String(userLocation.coords.latitude),
    longitude: userLocation && String(userLocation.coords.longitude),
  });

  const [errors, setErrors] = useState<Error>({});

  const {navigate} = useNavigation<TopLevelNavigationProp>();

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
    const {name, latitude, longitude} = validationResults;
    createSiteCallback({name, latitude, longitude});
    return navigate(ScreenRoutes.SITES_MAP);
  }, [mutationInput, createSiteCallback, navigate]);

  const locationOptions = useMemo(() => {
    const options: Record<'gps' | 'pin' | 'coords', LatLongString | undefined> =
      {
        coords: {latitude: '', longitude: ''},
        gps: userLocation && fromLocation(userLocation),
        pin: sitePin && fromLocation(sitePin),
      };
    return options;
  }, [userLocation, sitePin]);

  const updateLocationSource = useCallback(
    (key: 'gps' | 'pin' | 'coords') => {
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

  return (
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
      <RadioBlock<'gps' | 'pin' | 'coords'>
        label="Site Location"
        blockName="location"
        options={{
          gps: {text: 'Use my current location (GPS)'},
          pin: {
            text: 'Use map pin',
            isDisabled: sitePin === undefined,
          },
          coords: {text: 'Enter coordinates'},
        }}
        defaultValue="gps"
        onChange={updateLocationSource}
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
          leftElement={<Icon mr={2} as={MaterialIcons} name="edit" />}
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
          leftElement={<Icon mr={2} as={MaterialIcons} name="edit" />}
        />
      </FormControl>
      <FormControl>
        <FormControl.Label>Add to Project</FormControl.Label>
        <Input variant="underlined" />
      </FormControl>
      {/* TODO: Site privacy is not integrated on backend yet */}
      <RadioBlock<'public' | 'private'>
        label="Data Privacy"
        blockName="data-privacy"
        options={{
          public: {text: 'Public'},
          private: {text: 'Private'},
        }}
        defaultValue="private"
        oneLine={true}
      />
      <Fab label="SAVE" borderRadius={4} py={0} px={0} onPress={onSave} />
    </VStack>
  );
}
