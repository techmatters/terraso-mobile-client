import {Box, FlatList, HStack, Text, VStack} from 'native-base';
import {UserNameEmail} from '../../types';
import React from 'react';

type Props = {
  Users: UserNameEmail[];
};
export function EmailList({Users}: Props) {
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
