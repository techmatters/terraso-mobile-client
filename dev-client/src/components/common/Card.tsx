import {Box} from 'native-base';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import {Pressable} from 'react-native';
import {forwardRef} from 'react';

export const CardTopRightButton = forwardRef(
  (props: React.ComponentProps<typeof IconButton>, ref) => {
    return (
      <Box position="absolute" top="0px" right="0px" p="8px">
        <Pressable onPress={props.onPress}>
          <IconButton ref={ref} {...props} />
        </Pressable>
      </Box>
    );
  },
);

export const CardCloseButton = (
  props: Omit<React.ComponentProps<typeof CardTopRightButton>, 'name'>,
) => {
  return (
    <CardTopRightButton
      name="close"
      size="sm"
      background="grey.200"
      _icon={{color: 'action.active'}}
      borderRadius="full"
      {...props}
    />
  );
};

type CardProps = {
  buttons?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
} & React.ComponentProps<typeof Box>;
export const Card = ({buttons, onPress, children, ...boxProps}: CardProps) => {
  return (
    <Pressable onPress={onPress}>
      <Box variant="card" {...boxProps}>
        {children}
      </Box>
      {buttons}
    </Pressable>
  );
};
