import {Box, HStack, Icon, IconButton, StatusBar, Text} from 'native-base';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function AppBar(): JSX.Element {
  return (
    <>
      <StatusBar bg="primary.contrast" barStyle="light-content" />
      <Box safeAreaTop bg="primary.main" />
      <HStack
        bg="primary.main"
        px="1"
        py="3"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        maxW="350">
        <HStack alignItems="center">
          <IconButton
            icon={
              <Icon
                size="sm"
                as={MaterialIcons}
                name="menu"
                color="primary.contrast"
              />
            }
          />
          <Text color="primary.contrast">LandPKS</Text>
        </HStack>
        <HStack>
          <IconButton
            icon={<Icon as={MaterialIcons} name="help" />}
            size="sm"
            _icon={{color: 'primary.contrast'}}
          />
        </HStack>
      </HStack>
    </>
  );
}
