import {HStack} from 'native-base';
import {
  IconButton,
  IconButtonProps,
  MaterialCommunityIcons,
} from '../common/Icons';
import {useNavigation} from '../../screens/AppScaffold';
import {useCallback} from 'react';

const BottomNavIconButton = (props: IconButtonProps & {label: string}) => (
  <IconButton pb={0} _icon={{color: 'primary.contrast'}} {...props} />
);

export default function BottomNavigation() {
  const navigation = useNavigation();

  const onMap = useCallback(() => navigation.navigate('HOME'), [navigation]);

  const onProject = useCallback(
    () => navigation.navigate('PROJECT_LIST'),
    [navigation],
  );

  return (
    <HStack bg="primary.main" justifyContent="center" space={10} pb={2}>
      <BottomNavIconButton name="map" label="Map" onPress={onMap} />
      <BottomNavIconButton
        as={MaterialCommunityIcons}
        name="briefcase"
        label="Projects"
        onPress={onProject}
      />
      <BottomNavIconButton name="settings" label="Settings" />
    </HStack>
  );
}
