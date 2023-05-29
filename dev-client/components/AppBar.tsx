import {Box, HStack, Heading, StatusBar, Text} from 'native-base';
import MaterialIcon from './MaterialIcon';

type Props = {
  title: string;
};

export default function AppBar({title}: Props): JSX.Element {
  return (
    <HStack>
      <StatusBar bg="primary.contrast" barStyle="light-content" />
      <Box safeAreaTop bg="primary.main" />
      <HStack
        bg="primary.main"
        px="2"
        py="2"
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
          <Heading size="xs" color="primary.contrast">
            {title}
          </Heading>
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
