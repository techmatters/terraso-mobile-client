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

type Props = {
  projects: ProjectName[];
};

export default function CreateSiteView({}: Props) {
  return (
    <VStack p={5} space={3}>
      <FormControl>
        <Input placeholder="Site name" />
      </FormControl>
      <FormControl alignItems="flex-start">
        {/* TODO: color prop seems to be ignored by label; will need to wrap in Text*/}
        <FormControl.Label color="black">Site Location</FormControl.Label>
        <HStack>
          {/* TODO: Switch has same issues with checkbox, need to find replacement */}
          <Switch onTrackColor="primary.main" />
          <FormControl.HelperText color="text.primary">
            <Text>Use my current location (GPS)</Text>
            <Text>Location accuracy: x m</Text>
          </FormControl.HelperText>
        </HStack>
      </FormControl>
      <FormControl>
        <FormControl.Label>Latitude</FormControl.Label>
        <Input variant="underlined" />
      </FormControl>
      <FormControl>
        <FormControl.Label>Longitude</FormControl.Label>
        <Input variant="underlined" />
      </FormControl>
      <FormControl>
        <FormControl.Label>Add to Project</FormControl.Label>
        <Input variant="underlined" />
      </FormControl>
      <RadioBlock
        label="Data Privacy"
        blockName="data-privacy"
        options={[
          {value: 'public', text: 'Public'},
          {value: 'private', text: 'Private'},
        ]}
        defaultValue="private"
      />
      <Fab label="SAVE" borderRadius={4} py={0} px={0}></Fab>
    </VStack>
  );
}
