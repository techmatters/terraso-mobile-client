import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {Box, HStack, Input, Text} from 'native-base';
import RadioBlock from "../components/common/RadioBlock";
import MaterialIconButton from "../components/common/MaterialIconButton";

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.CREATE_PROJECT
>;

export default function CreateProjectScreen({route}: Props) {
  return (
    <Box mt={5}>
      <Input placeholder="Project Name" />
      <Input placeholder="Project Description (optional)" />
      <RadioBlock
        label={
          <HStack alignItems="center">
            <Text>Data Privacy</Text>
            <MaterialIconButton name="info" />
          </HStack>
        }
        options={[
          {text: 'Public', value: 'public'},
          {text: 'Private', value: 'private'},
        ]}
        blockName="data-privacy"
      />
    </Box>
  );
}
