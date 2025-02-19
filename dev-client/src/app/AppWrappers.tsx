import React from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {PaperProvider, Portal} from 'react-native-paper';
import {Provider} from 'react-redux';

import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {NavigationContainer} from '@react-navigation/native';
import {NativeBaseProvider} from 'native-base';

import {ForegroundPermissionsProvider} from 'terraso-mobile-client/context/AppPermissionsContext';
import {ConnectivityContextProvider} from 'terraso-mobile-client/context/connectivity/ConnectivityContext';
import {GeospatialProvider} from 'terraso-mobile-client/context/GeospatialContext';
import {HeaderHeightProvider} from 'terraso-mobile-client/context/HeaderHeightContext';
import {SitesScreenContextProvider} from 'terraso-mobile-client/context/SitesScreenContext';
import {SoilIdMatchContextProvider} from 'terraso-mobile-client/context/SoilIdMatchContext';
import {SyncNotificationContextProvider} from 'terraso-mobile-client/context/SyncNotificationContext';
import {AppStore} from 'terraso-mobile-client/store';
import {paperTheme, theme} from 'terraso-mobile-client/theme';

type Props = React.PropsWithChildren<{
  store: AppStore;
}>;
export const AppWrappers = ({store, children}: Props) => {
  /*
   * Notes on app root stack ordering:
   * - Provider should be above all other content, since it exposes our Redux store
   * - HeaderHeightContext needs to be above bottom sheets, so they can access its height values for sizing
   * - NavigationContainer needs to be above any app content (including modals) since content may include
   *    functionality that navigates to new screens
   * - There currently need to be two BottomSheetModalProvider instances, one below
   *    PaperProvider/NativeBaseProvider and one above, since some modals can open sheets, and some sheets need
   *    NB/Paper components.
   */

  return (
    <GestureHandlerRootView style={styles.gestureHandler}>
      <Provider store={store}>
        <NavigationContainer
        // uncomment to enable screen stack debugging
        // onStateChange={console.log}
        >
          <ConnectivityContextProvider>
            <HeaderHeightProvider>
              <BottomSheetModalProvider>
                <PaperProvider theme={paperTheme}>
                  <NativeBaseProvider theme={theme}>
                    <Portal.Host>
                      <BottomSheetModalProvider>
                        <GeospatialProvider>
                          <SitesScreenContextProvider>
                            <ForegroundPermissionsProvider>
                              <SyncNotificationContextProvider>
                                <SoilIdMatchContextProvider>
                                  {children}
                                </SoilIdMatchContextProvider>
                              </SyncNotificationContextProvider>
                            </ForegroundPermissionsProvider>
                          </SitesScreenContextProvider>
                        </GeospatialProvider>
                      </BottomSheetModalProvider>
                    </Portal.Host>
                  </NativeBaseProvider>
                </PaperProvider>
              </BottomSheetModalProvider>
            </HeaderHeightProvider>
          </ConnectivityContextProvider>
        </NavigationContainer>
      </Provider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureHandler: {flex: 1},
});
