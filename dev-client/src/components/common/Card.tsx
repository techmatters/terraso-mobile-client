import {Box} from 'native-base';
import {IconButton} from './Icons';
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

export const CardTriangle = () => {
  return (
    <Box
      width={0}
      height={0}
      borderBottomWidth={15}
      borderBottomColor="white"
      borderLeftWidth={15}
      borderLeftColor="transparent"
      borderRightWidth={15}
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
  showTriangle?: Boolean;
} & React.ComponentProps<typeof Box>;

export const Card = ({
  buttons,
  onPress,
  children,
  showTriangle,
  ...boxProps
}: CardProps) => {
  return (
    <Pressable onPress={onPress}>
      <Box
        variant="card"
        marginTop={showTriangle ? '15px' : '0px'}
        {...boxProps}>
        {showTriangle && <CardTriangle />}
        {children}
        {buttons}
      </Box>
    </Pressable>
  );
};
