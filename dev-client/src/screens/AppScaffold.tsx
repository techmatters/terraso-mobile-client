import {
  NativeStackNavigationOptions,
  NativeStackScreenProps,
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from '../model/store';
import React, {useEffect} from 'react';
import {
  setHasAccessTokenAsync,
  fetchUser,
} from 'terraso-client-shared/account/accountSlice';
import {LoginScreen} from './LoginScreen';
import {ProjectListScreen} from './ProjectListScreen';
import {ProjectViewScreen} from './ProjectViewScreen';
import {CreateProjectScreen} from './CreateProjectScreen';
import {HomeScreen} from './HomeScreen';
import {SiteTransferProjectScreen} from './SiteTransferProject';
import {CreateSiteScreen} from './CreateSiteScreen';
import {useNavigation as useNavigationNative} from '@react-navigation/native';
import {LocationDashboardScreen} from '../components/sites/LocationDashboardScreen';
import {SiteSettingsScreen} from '../components/sites/SiteSettingsScreen';
import {SiteTeamSettingsScreen} from '../components/sites/SiteTeamSettings';
import {Location, locationManager} from '@rnmapbox/maps';
import {updateLocation} from '../model/map/mapSlice';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from '../constants';
import {AddUserToProjectScreen} from '../components/projects/AddUserToProjectScreen';

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
} satisfies Record<string, React.FC<any>>;

type ScreenName = keyof typeof screenDefinitions;
type UnknownToUndefined<T extends unknown> = unknown extends T ? undefined : T;
type RootStackParamList = {
  [K in ScreenName]: UnknownToUndefined<
    React.ComponentProps<(typeof screenDefinitions)[K]>
  >;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export type RootStackScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenName
>;

const screens = Object.entries(screenDefinitions).map(([name, Screen]) => (
  <RootStack.Screen
    name={name as ScreenName}
    key={name}
    children={props => <Screen {...((props.route.params ?? {}) as any)} />}
  />
));

export const useNavigation = <Name extends ScreenName = ScreenName>() =>
  useNavigationNative<NativeStackNavigationProp<RootStackParamList, Name>>();

const defaultScreenOptions: NativeStackNavigationOptions = {headerShown: false};

export default function AppScaffold() {
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
    const listener = ({coords}: Location) => dispatch(updateLocation(coords));
    locationManager.setMinDisplacement(USER_DISPLACEMENT_MIN_DISTANCE_M);
    locationManager.addListener(listener);
    return () => locationManager.removeListener(listener);
  }, [dispatch]);

  return (
    <RootStack.Navigator
      initialRouteName={!hasToken ? 'LOGIN' : 'HOME'}
      screenOptions={defaultScreenOptions}>
      {screens}
    </RootStack.Navigator>
  );
}
