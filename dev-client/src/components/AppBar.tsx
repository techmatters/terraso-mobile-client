import {Box, HStack, Heading, StatusBar} from 'native-base';
import {IconButton} from './common/Icons';

type Props = {
  title: string;
};

export default function AppBar({title}: Props): JSX.Element {
  return (
    <HStack flex={1}>
      <StatusBar backgroundColor="primary.contrast" barStyle="light-content" />
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
          <IconButton
            name="menu"
            size="sm"
            _icon={{
              color: 'primary.contrast',
            }}
          />
          <Heading size="xs" color="primary.contrast">
            {title}
          </Heading>
        </HStack>
        <HStack>
          <IconButton
            name="help"
            size="sm"
            _icon={{
              color: 'primary.contrast',
            }}
          />
        </HStack>
      </HStack>
    </HStack>
  );
}
