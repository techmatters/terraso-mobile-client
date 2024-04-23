import {IconButton as NativeIconButton} from 'native-base';
import React from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import {
  Box,
  HStack,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';

export type LinkNewWindowIconProps = React.ComponentProps<
  typeof NativeIconButton
> & {
  label: string;
  url: string;
};

export const LinkNewWindowIcon = React.forwardRef(
  ({label, url, ...props}: LinkNewWindowIconProps, ref: React.Ref<unknown>) => {
    const icon = (
      <NativeIconButton
        ref={ref}
        icon={<Icon name={'open-in-new'} />}
        {...props}
      />
    );

    return (
      <View style={styles.container}>
        <Pressable onPress={() => Linking.openURL(url)}>
          <Box>
            <HStack>
              <Text
                color={'primary.main'}
                fontSize="md"
                textTransform={'uppercase'}
                style={styles.label}>
                {label}
              </Text>
              {icon}
            </HStack>
          </Box>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  label: {
    marginRight: 4,
    verticalAlign: 'middle',
  },
});
// import {View} from 'react-native';
// import {Icon} from 'terraso-mobile-client/components/icons/Icon';

// export const LinkNewWindowIcon = () => {
//   return (
//     // eslint-disable-next-line react-native/no-inline-styles
//     <View style={{flexDirection: 'row'}}>
//       <Icon name="open-in-new" color="primary.main" size={14} />
//     </View>
//   );
// };
