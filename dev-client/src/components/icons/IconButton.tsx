import {IconButton as NativeIconButton, Center} from 'native-base';
import React from 'react';
import {Pressable} from 'react-native';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {IconName, Icon} from 'terraso-mobile-client/components/icons/Icon';

export type IconButtonProps = React.ComponentProps<typeof NativeIconButton> & {
  name: IconName;
  label?: string;
};

export const IconButton = React.forwardRef(
  ({name, label, ...props}: IconButtonProps, ref: React.Ref<unknown>) => {
    const icon = (
      <NativeIconButton ref={ref} icon={<Icon name={name} />} {...props} />
    );
    if (label === undefined) {
      return icon;
    }
    return (
      <Pressable onPress={props.onPress}>
        <Box p="1">
          {icon}
          <Center>
            <Text color="primary.contrast" fontSize="xs">
              {label}
            </Text>
          </Center>
        </Box>
      </Pressable>
    );
  },
);
