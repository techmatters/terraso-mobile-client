import {
  NativeStackNavigationOptions,
  NativeStackScreenProps,
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {useTheme} from 'native-base';
import {useDispatch, useSelector} from '../model/store';
import {useEffect, useMemo} from 'react';
import {
  setHasAccessTokenAsync,
  fetchUser,
} from 'terraso-client-shared/account/accountSlice';
import {LoginScreen} from './LoginScreen';
import {ProjectListScreen} from './ProjectListScreen';
import {ProjectViewScreen} from './ProjectViewScreen';
import {CreateProjectScreen} from './CreateProjectScreen';
import {HomeScreen} from './HomeScreen';
import {useTranslation} from 'react-i18next';
import {HeaderTitle as NavigationHeaderTitle} from '@react-navigation/elements';
import {SiteTransferProjectScreen} from './SiteTransferProject';
import {CreateSiteScreen} from './CreateSiteScreen';
import {useNavigation as useNavigationNative} from '@react-navigation/native';
import {LocationDashboardScreen} from '../components/sites/LocationDashboardScreen';
import {SiteSettingsScreen} from '../components/sites/SiteSettingsScreen';
import {SiteTeamSettingsScreen} from '../components/sites/SiteTeamSettings';

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
};

type ScreenName = keyof typeof screenDefinitions;
type RootStackParamList = {
  [K in ScreenName]: Parameters<(typeof screenDefinitions)[K]['View']>[0];
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export type RootStackScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenName
>;

export type ScreenDefinition<Props = undefined> = {
  View: (T: Props) => React.ReactNode;
  options?: (_: Props) => NativeStackNavigationOptions;
};

const DefaultHeader = ({
  name,
  ...props
}: React.ComponentProps<typeof NavigationHeaderTitle> & {name: string}) => {
  const {t} = useTranslation();
  return (
    <NavigationHeaderTitle {...props}>
      {t('screens.' + name) ?? name}
    </NavigationHeaderTitle>
  );
};

const defineScreen = <
  Name extends ScreenName,
  Props extends RootStackParamList[Name],
>(
  name: Name,
  {options = () => ({}), View: ScreenView}: ScreenDefinition<Props>,
) => {
  const Component = (props: RootStackScreenProps) => (
    <ScreenView {...((props.route.params ?? {}) as Props & object)} />
  );

  return (
    <RootStack.Screen
      name={name}
      key={name}
      component={Component}
      options={({route: {params}}) => options(params as Props)}
    />
  );
};

const screens = Object.entries(screenDefinitions).map(([name, screen]) =>
  defineScreen(name as ScreenName, screen as ScreenDefinition),
);

export const useNavigation = <Name extends ScreenName = ScreenName>() =>
  useNavigationNative<NativeStackNavigationProp<RootStackParamList, Name>>();

export default function AppScaffold() {
  const dispatch = useDispatch();
  const hasToken = useSelector(state => state.account.hasToken);
  const currentUser = useSelector(state => state.account.currentUser.data);
  // using theme hook here because react-navigation doesn't take nativebase utility props
  const {colors} = useTheme();

  const defaultScreenOptions = useMemo<NativeStackNavigationOptions>(
    () => ({
      headerStyle: {backgroundColor: colors.primary.main},
      headerTintColor: colors.primary.contrast,
      headerTitle: ({children: name, ...props}) => (
        <DefaultHeader name={name} {...props} />
      ),
    }),
    [colors],
  );

  useEffect(() => {
    if (!hasToken) {
      dispatch(setHasAccessTokenAsync());
    }
    if (hasToken && currentUser === null) {
      dispatch(fetchUser());
    }
  }, [hasToken, currentUser, dispatch]);

  return (
    <RootStack.Navigator
      initialRouteName={currentUser === null ? 'LOGIN' : 'HOME'}
      screenOptions={defaultScreenOptions}>
      {screens}
    </RootStack.Navigator>
  );
}
