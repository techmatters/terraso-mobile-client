import {
  NativeStackNavigationOptions,
  NativeStackScreenProps,
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import React, {useEffect} from 'react';
import {
  setHasAccessTokenAsync,
  fetchUser,
} from 'terraso-client-shared/account/accountSlice';
import {LoginScreen} from 'terraso-mobile-client/screens/LoginScreen';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen';
import {ProjectViewScreen} from 'terraso-mobile-client/screens/ProjectViewScreen';
import {CreateProjectScreen} from 'terraso-mobile-client/screens/CreateProjectScreen';
import {HomeScreen} from 'terraso-mobile-client/screens/HomeScreen';
import {SiteTransferProjectScreen} from 'terraso-mobile-client/screens/SiteTransferProjectScreen';
import {CreateSiteScreen} from 'terraso-mobile-client/screens/CreateSiteScreen';
import {AddSiteNoteScreen} from 'terraso-mobile-client/components/siteNotes/AddSiteNoteScreen';
import {EditSiteNoteScreen} from 'terraso-mobile-client/components/siteNotes/EditSiteNoteScreen';
import {useNavigation as useNavigationNative} from '@react-navigation/native';
import {LocationDashboardScreen} from 'terraso-mobile-client/components/sites/LocationDashboardScreen';
import {SiteSettingsScreen} from 'terraso-mobile-client/components/sites/SiteSettingsScreen';
import {SiteTeamSettingsScreen} from 'terraso-mobile-client/components/sites/SiteTeamSettings';
import {Location, locationManager} from '@rnmapbox/maps';
import {updateLocation} from 'terraso-mobile-client/model/map/mapSlice';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from 'terraso-mobile-client/constants';
import {AddUserToProjectScreen} from 'terraso-mobile-client/components/projects/AddUserToProjectScreen';
import {ManageTeamMemberScreen} from 'terraso-mobile-client/components/projects/ManageTeamMemberScreen';

type UnknownToUndefined<T extends unknown> = unknown extends T ? undefined : T;
export type ScreenDefinitions = Record<string, React.FC<any>>;
export type ModalScreenDefinitions = Record<string, React.FC<any>>;
export type ParamList<T extends ScreenDefinitions> = {
  [K in keyof T]: UnknownToUndefined<React.ComponentProps<T[K]>>;
};

const screenDefinitions = {
  LOGIN: LoginScreen,
  PROJECT_LIST: ProjectListScreen,
  PROJECT_VIEW: ProjectViewScreen,
  HOME: HomeScreen,
  CREATE_PROJECT: CreateProjectScreen,
  SITE_TRANSFER_PROJECT: SiteTransferProjectScreen,
  CREATE_SITE: CreateSiteScreen,
  LOCATION_DASHBOARD: LocationDashboardScreen,
  SITE_SETTINGS: SiteSettingsScreen,
  SITE_TEAM_SETTINGS: SiteTeamSettingsScreen,
  ADD_USER_PROJECT: AddUserToProjectScreen,
  MANAGE_TEAM_MEMBER: ManageTeamMemberScreen,
} satisfies ScreenDefinitions;

const modalScreenDefinitions = {
  ADD_SITE_NOTE: AddSiteNoteScreen,
  EDIT_SITE_NOTE: EditSiteNoteScreen,
} satisfies ModalScreenDefinitions;

type RootStackParamList = ParamList<typeof screenDefinitions>;
type ScreenName = keyof RootStackParamList;

const RootStack = createNativeStackNavigator<RootStackParamList>();

export type RootStackScreenProps = NativeStackScreenProps<RootStackParamList>;

const screens = Object.entries(screenDefinitions).map(([name, Screen]) => (
  <RootStack.Screen
    name={name as ScreenName}
    key={name}
    children={props => <Screen {...((props.route.params ?? {}) as any)} />}
  />
));

const modalScreens = Object.entries(modalScreenDefinitions).map(
  ([name, Screen]) => (
    <RootStack.Screen
      name={name as ScreenName}
      key={name}
      children={props => <Screen {...((props.route.params ?? {}) as any)} />}
    />
  ),
);

export const useNavigation = <Name extends ScreenName = ScreenName>() =>
  useNavigationNative<NativeStackNavigationProp<RootStackParamList, Name>>();

const defaultScreenOptions: NativeStackNavigationOptions = {headerShown: false};

export function AppScaffold() {
  const dispatch = useDispatch();
  const hasToken = useSelector(state => state.account.hasToken);
  const currentUser = useSelector(state => state.account.currentUser.data);

  useEffect(() => {
    if (!hasToken) {
      dispatch(setHasAccessTokenAsync());
    }
    if (hasToken && currentUser === null) {
      dispatch(fetchUser());
    }
  }, [hasToken, currentUser, dispatch]);

  useEffect(() => {
    const listener = ({coords}: Location) =>
      dispatch(
        updateLocation({coords: coords, accuracyM: coords.accuracy ?? null}),
      );
    locationManager.setMinDisplacement(USER_DISPLACEMENT_MIN_DISTANCE_M);
    locationManager.addListener(listener);
    return () => locationManager.removeListener(listener);
  }, [dispatch]);

  return (
    <RootStack.Navigator
      initialRouteName={!hasToken ? 'LOGIN' : 'HOME'}
      screenOptions={defaultScreenOptions}>
      <RootStack.Group>{screens}</RootStack.Group>
      <RootStack.Group screenOptions={{presentation: 'modal'}}>
        {modalScreens}
      </RootStack.Group>
    </RootStack.Navigator>
  );
}
