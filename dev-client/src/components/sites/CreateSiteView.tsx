import {Location} from '@rnmapbox/maps';
import {ProjectName} from '../../types';
import RadioBlock from '../common/RadioBlock';
import {
  Fab,
  FormControl,
  HStack,
  Input,
  Switch,
  Text,
  VStack,
} from 'native-base';
import {useCallback, useState} from 'react';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {useNavigation} from '@react-navigation/native';
import {TopLevelNavigationProp} from '../../screens';
import {ScreenRoutes} from '../../screens/constants';

type Props = {
  projects: ProjectName[];
  userLocation?: Location;
  createSiteCallback?: (input: SiteAddMutationInput) => void;
};

export default function CreateSiteView({
  userLocation,
  createSiteCallback,
}: Props) {
  const [useLocation, setUseLocation] = useState(true);

  const [mutationInput, setMutationInput] = useState<
    Partial<SiteAddMutationInput>
  >({
    latitude:
      userLocation && useLocation ? userLocation.coords.latitude : undefined,
    longitude:
      userLocation && useLocation ? userLocation.coords.longitude : undefined,
  });

  const {navigate} = useNavigation<TopLevelNavigationProp>();

  const onSave = useCallback(() => {
    if (createSiteCallback === undefined) {
      return;
    }
    if (
      mutationInput.name === undefined ||
      mutationInput.latitude === undefined ||
      mutationInput.longitude === undefined
    ) {
      throw 'Missing fields';
    }
    const {name, latitude, longitude} = mutationInput;
    createSiteCallback({name, latitude, longitude});
    return navigate(ScreenRoutes.SITES_MAP);
  }, [mutationInput, createSiteCallback]);

  return (
    <VStack p={5} space={3}>
      <FormControl>
        <Input
          placeholder="Site name"
          value={mutationInput.name}
          onChangeText={name => setMutationInput({...mutationInput, name})}
        />
      </FormControl>
      <FormControl alignItems="flex-start">
        {/* TODO: color prop seems to be ignored by label; will need to wrap in Text*/}
        <FormControl.Label color="black">Site Location</FormControl.Label>
        <HStack>
          {/* TODO: Switch has same issues with checkbox, need to find replacement */}
          <Switch
            onTrackColor="primary.main"
            value={useLocation}
            onToggle={() => setUseLocation(!useLocation)}
          />
          <FormControl.HelperText color="text.primary">
            <Text>Use my current location (GPS)</Text>
            <Text>Location accuracy: x m</Text>
          </FormControl.HelperText>
        </HStack>
      </FormControl>
      <FormControl>
        <FormControl.Label>Latitude</FormControl.Label>
        <Input
          variant="underlined"
          defaultValue={String(mutationInput.latitude)}
          onChangeText={latitude =>
            setMutationInput({...mutationInput, latitude: Number(latitude)})
          }
        />
      </FormControl>
      <FormControl>
        <FormControl.Label>Longitude</FormControl.Label>
        <Input
          variant="underlined"
          defaultValue={String(mutationInput.longitude)}
          onChangeText={longitude =>
            setMutationInput({...mutationInput, longitude: Number(longitude)})
          }
        />
      </FormControl>
      <FormControl>
        <FormControl.Label>Add to Project</FormControl.Label>
        <Input variant="underlined" />
      </FormControl>
      {/* TODO: Site privacy is not integrated on backend yet */}
      <RadioBlock
        label="Data Privacy"
        blockName="data-privacy"
        options={[
          {value: 'public', text: 'Public'},
          {value: 'private', text: 'Private'},
        ]}
        defaultValue="private"
      />
      <Fab label="SAVE" borderRadius={4} py={0} px={0} onPress={onSave} />
    </VStack>
  );
}
