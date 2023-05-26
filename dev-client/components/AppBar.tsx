import {Box, HStack, StatusBar, Text} from 'native-base';
import MaterialIcon from './MaterialIcon';

export default function AppBar(): JSX.Element {
  return (
    <HStack>
      <StatusBar bg="primary.contrast" barStyle="light-content" />
      <Box safeAreaTop bg="primary.main" />
      <HStack
        bg="primary.main"
        px="2"
        py="3"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        maxW="350">
        <HStack alignItems="center">
          <MaterialIcon
            name="menu"
            iconButtonProps={{
              size: 'sm',
            }}
            iconProps={{
              color: 'primary.contrast',
            }}
          />
          <Text color="primary.contrast">LandPKS</Text>
        </HStack>
        <HStack>
          <MaterialIcon
            name="help"
            iconButtonProps={{
              size: 'sm',
            }}
            iconProps={{
              color: 'primary.contrast',
            }}
          />
        </HStack>
      </HStack>
    </HStack>
  );
}
