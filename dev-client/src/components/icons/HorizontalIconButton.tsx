import {IconButton as NativeIconButton} from 'native-base';
import React from 'react';
import {Pressable} from 'react-native';
import {
  Box,
  HStack,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {IconName, Icon} from 'terraso-mobile-client/components/icons/Icon';

export type HorizontalIconButtonProps = React.ComponentProps<
  typeof NativeIconButton
> & {
  name: IconName;
  label?: string;
  colorScheme?: string;
  isUppercase?: boolean;
};

export const HorizontalIconButton = React.forwardRef(
  (
    {
      name,
      label,
      colorScheme = 'primary.contrast',
      isUppercase = false,
      ...props
    }: HorizontalIconButtonProps,
    ref: React.Ref<unknown>,
  ) => {
    const icon = (
      <NativeIconButton
        p={0}
        ref={ref}
        icon={<Icon name={name} />}
        {...props}
      />
    );

    return (
      <Pressable onPress={props.onPress}>
        <Box>
          <HStack>
            {icon}
            <Text
              color={colorScheme}
              fontSize="md"
              pl={1}
              textTransform={isUppercase ? 'uppercase' : 'none'}>
              {label}
            </Text>
          </HStack>
        </Box>
      </Pressable>
    );
  },
);
