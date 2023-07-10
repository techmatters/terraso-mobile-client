import {Box, Center, HStack, Text} from 'native-base';
import MaterialIconButton from '../common/MaterialIconButton';
import MaterialCommunityIconButton from '../common/MaterialCommunityIconButton';
import {useNavigation} from '@react-navigation/native';
import {useCallback} from 'react';
import {ScreenRoutes} from '../../screens/constants';
import {TopLevelNavigationProp} from '../../screens';
import {SITE_DISPLAYS, fetchProjects} from '../../dataflow';

type IconProps = {
  name: string;
  label: string;
  onPress?: () => void;
  IconComponent?: any;
};

const LabeledIcon = ({name, label, onPress, IconComponent}: IconProps) => {
  const Button = IconComponent ?? MaterialIconButton;
  return (
    <Box p="1">
      <Button
        name={name}
        iconProps={{color: 'primary.contrast'}}
        iconButtonProps={{pb: 0}}
        onPress={onPress}
      />
      <Center>
        <Text color="primary.contrast" fontSize="xs">
          {label}
        </Text>
      </Center>
    </Box>
  );
};

export default function BottomNavigation() {
  const navigation = useNavigation<TopLevelNavigationProp>();

  const onMap = useCallback(
    () => navigation.navigate(ScreenRoutes.SITES_MAP),
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
      <LabeledIcon name="map" label="Map" onPress={onMap} />
      <LabeledIcon
        name="briefcase"
        label="Projects"
        onPress={onProject}
        IconComponent={MaterialCommunityIconButton}
      />
      <LabeledIcon name="settings" label="Settings" />
    </HStack>
  );
}
