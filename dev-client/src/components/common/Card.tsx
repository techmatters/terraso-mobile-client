import {Box} from 'native-base';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import {Pressable} from 'react-native';
import {forwardRef} from 'react';

const TRIANGLE_BORDER_WIDTH = 15;

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

export const CardTriangle = () => {
  return (
    <Box
      width={0}
      height={0}
      borderBottomWidth={TRIANGLE_BORDER_WIDTH}
      borderBottomColor="white"
      borderLeftWidth={TRIANGLE_BORDER_WIDTH}
      borderLeftColor="transparent"
      borderRightWidth={TRIANGLE_BORDER_WIDTH}
      borderRightColor="transparent"
      alignSelf="center"
      position="absolute"
      top={-14}
    />
  );
};

type CardProps = {
  buttons?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  isPopover?: Boolean;
} & React.ComponentProps<typeof Box>;

export const Card = ({
  buttons,
  onPress,
  children,
  isPopover,
  ...boxProps
}: CardProps) => {
  console.log('isPopover:', isPopover);
  return (
    <Pressable onPress={onPress}>
      <Box variant="card" marginTop={isPopover ? '15px' : '0px'} {...boxProps}>
        {isPopover && <CardTriangle />}
        {children}
        {buttons}
      </Box>
    </Pressable>
  );
};
