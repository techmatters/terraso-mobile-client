import {Box} from 'native-base';
import {IconButton} from './Icons';
import {Pressable} from 'react-native';

export const CardCloseButton = ({onPress}: {onPress: () => void}) => {
  return (
    <IconButton
      name="close"
      size="sm"
      background="grey.200"
      _icon={{color: 'action.active'}}
      borderRadius="full"
      onPress={onPress}
    />
  );
};

type CardProps = {
  topRightButton?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
};
export const Card = ({topRightButton, onPress, children}: CardProps) => {
  return (
    <Pressable onPress={onPress}>
      <Box variant="card">{children}</Box>
      <Box position="absolute" top="8px" right="8px">
        {topRightButton}
      </Box>
    </Pressable>
  );
};
