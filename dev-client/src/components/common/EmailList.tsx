import React, {useCallback, useState} from 'react';
import {Box, FlatList, HStack, Text, VStack} from 'native-base';
import {UserNameEmail} from '../../types';
import MaterialIconButton from './MaterialIconButton';
import {useNavigation} from '@react-navigation/native';
import {TopLevelNavigationProp} from '../../screens';

type Props = {
  Users: UserNameEmail[];
};
export function EmailList({Users}: Props) {
    const state,  = useState();
  const onPress = useCallback(() => {}, []);
  return (
    <Box>
      <FlatList
        data={Users}
        renderItem={({item}) => (
          <Box
            borderBottomWidth="1"
            _dark={{
              borderColor: 'muted.50',
            }}
            borderColor="muted.800"
            pl={['0', '4']}
            pr={['0', '5']}
            py="2">
            <HStack space={[2, 3]} justifyContent="space-between">
              <MaterialIconButton
                name="close"
                iconProps={{color: 'primary.contrast'}}
                onPress={onPress}
              />
              <VStack>
                <Text
                  _dark={{
                    color: 'warmGray.50',
                  }}
                  color="coolGray.800"
                  bold>
                  {item.name}
                </Text>
                <Text
                  color="coolGray.600"
                  _dark={{
                    color: 'warmGray.200',
                  }}>
                  {item.email}
                </Text>
              </VStack>
            </HStack>
          </Box>
        )}
      />
    </Box>
  );
}
