import {HStack} from 'native-base';
import {
  IconButton,
  IconButtonProps,
  MaterialCommunityIcons,
} from '../common/Icons';
import {useNavigation} from '@react-navigation/native';
import {useCallback} from 'react';
import {ScreenRoutes} from '../../screens/constants';
import {TopLevelNavigationProp} from '../../screens';
import {fetchProjects} from '../../dataflow';

const BottomNavIconButton = (props: IconButtonProps & {label: string}) => (
  <IconButton pb={0} _icon={{color: 'primary.contrast'}} {...props} />
);

export default function BottomNavigation() {
  const navigation = useNavigation<TopLevelNavigationProp>();

  const onMap = useCallback(
    () => navigation.navigate(ScreenRoutes.HOME),
    [navigation],
  );

  const onProject = useCallback(
    () =>
      navigation.navigate(ScreenRoutes.PROJECT_LIST, {
        projects: fetchProjects(),
      }),
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
