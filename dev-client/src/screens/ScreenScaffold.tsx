/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {useCallback, useState} from 'react';
import {StatusBar, View, LayoutChangeEvent, StyleSheet} from 'react-native';
import {Box, Column, useTheme} from 'native-base';

import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {HeaderHeightContext} from 'terraso-mobile-client/context/HeaderHeightContext';
import {SafeAreaView} from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  AppBar?: React.ReactNode;
  BottomNavigation?: null;
};

export const ScreenScaffold = ({
  children,
  AppBar: PropsAppBar = <AppBar />,
}: Props) => {
  const {colors} = useTheme();

  const [headerHeight, setHeaderHeight] = useState<number | undefined>(
    undefined,
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height),
    [setHeaderHeight],
  );

  return (
    <SafeAreaView
      style={[
        styles.safeAreaContainer,
        {backgroundColor: colors.primary.dark},
      ]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor={'#00000000'}
      />
      <Column backgroundColor={colors.white} flex={1}>
        <View onLayout={onLayout}>{PropsAppBar}</View>
        <HeaderHeightContext.Provider value={headerHeight ?? 0}>
          <Box flex={1}>{children}</Box>
        </HeaderHeightContext.Provider>
      </Column>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
});
