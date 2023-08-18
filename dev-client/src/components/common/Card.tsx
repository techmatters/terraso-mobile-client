import {Box} from 'native-base';
import {IconButton} from './Icons';

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
  topRightButton?: React.ReactElement;
  children?: React.ReactNode;
};
export const Card = ({topRightButton, children}: CardProps) => {
  return (
    <Box>
      <Box variant="card">{children}</Box>
      <Box position="absolute" top="8px" right="8px">
        {topRightButton}
      </Box>
    </Box>
  );
};
