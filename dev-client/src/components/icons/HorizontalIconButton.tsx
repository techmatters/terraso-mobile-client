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
  iconFirst?: boolean;
};

export const HorizontalIconButton = React.forwardRef(
  (
    {
      name,
      label,
      colorScheme = 'primary.contrast',
      isUppercase = false,
      iconFirst = true,
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
            {iconFirst ? icon : null}
            <Text
              color={colorScheme}
              fontSize="md"
              pl={1}
              textTransform={isUppercase ? 'uppercase' : 'none'}>
              {label}
            </Text>
            {iconFirst ? null : icon}
          </HStack>
        </Box>
      </Pressable>
    );
  },
);
