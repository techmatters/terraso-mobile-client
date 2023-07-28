import {Box, Flex, HStack} from 'native-base';
import {
  IconButton,
  IconButtonProps,
  MaterialCommunityIcons,
} from '../components/common/Icons';
import {useNavigation} from './AppScaffold';
import {useCallback} from 'react';

const BottomNavIconButton = (props: IconButtonProps & {label: string}) => (
  <IconButton pb={0} _icon={{color: 'primary.contrast'}} {...props} />
);

export const BottomNavigation = () => {
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
};

type Props = React.ComponentProps<typeof Box>;

export const ScreenScaffold = ({children, ...props}: Props) => (
  <Flex flex={1}>
    <Box flex={1} {...props}>
      {children}
    </Box>
    <BottomNavigation />
  </Flex>
);
