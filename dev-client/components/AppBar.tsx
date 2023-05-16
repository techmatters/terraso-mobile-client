import {Box, HStack, Icon, IconButton, StatusBar, Text} from 'native-base';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialIcon from './MaterialIcon';

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
          <MaterialIcon
            size="sm"
            iconName="menu"
            themeColor="primary.contrast"
          />
          <Text color="primary.contrast">LandPKS</Text>
        </HStack>
        <HStack>
          <MaterialIcon
            size="sm"
            iconName="help"
            themeColor="primary.contrast"
          />
        </HStack>
      </HStack>
    </>
  );
}
