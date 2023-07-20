import {
  NativeStackNavigationOptions,
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {useTheme} from 'native-base';
import {useDispatch, useSelector} from '../model/store';
import {useEffect} from 'react';
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
import {
  NavigationProp,
  useNavigation as useNavigationNative,
} from '@react-navigation/native';
import {SiteDashboardScreen} from './SiteDashboardScreen';

const screens = {
  LOGIN: LoginScreen,
  PROJECT_LIST: ProjectListScreen,
  PROJECT_VIEW: ProjectViewScreen,
  HOME: HomeScreen,
  CREATE_PROJECT: CreateProjectScreen,
  SITE_TRANSFER_PROJECT: SiteTransferProjectScreen,
  CREATE_SITE: CreateSiteScreen,
  SITE_DASHBOARD: SiteDashboardScreen,
};

type ScreenName = keyof typeof screens;
type RootStackParamList = {
  [K in ScreenName]: Parameters<(typeof screens)[K]['View']>[0];
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
export type RootStackScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenName
>;

type HeaderTitleType<Props> = (
  _: Props & React.ComponentProps<typeof NavigationHeaderTitle>,
) => React.ReactNode;

type RootStackNavigationOptions<Props> = Omit<
  NativeStackNavigationOptions,
  'headerTitle'
> & {
  HeaderTitle?: HeaderTitleType<Props>;
};

export type ScreenDefinition<Props = undefined> = {
  View: (T: Props) => React.ReactNode;
  options?: (_: Props) => RootStackNavigationOptions<Props>;
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
  {options, View}: ScreenDefinition<Props>,
) => {
  const wrappedOptions = (
    props: RootStackScreenProps,
  ): NativeStackNavigationOptions => {
    const {HeaderTitle = undefined, ...origOptions} =
      options === undefined ? {} : options(props.route.params as Props);
    const CastTitle = HeaderTitle as HeaderTitleType<object> | undefined;
    return {
      ...origOptions,
      headerTitle: ({tintColor}) =>
        CastTitle !== undefined ? (
          <CastTitle {...props.route.params} tintColor={tintColor} />
        ) : (
          <DefaultHeader name={name} tintColor={tintColor} />
        ),
    };
  };

  const Component = (props: RootStackScreenProps) => (
    <View {...((props.route.params ?? {}) as Props & object)} />
  );

  return [
    name,
    <RootStack.Screen
      name={name}
      key={name}
      component={Component}
      options={wrappedOptions}
    />,
  ];
};

const definedScreens = Object.fromEntries(
  Object.entries(screens).map(([name, screen]) =>
    defineScreen(name as ScreenName, screen as ScreenDefinition),
  ),
);

export const useNavigation = <Name extends ScreenName = ScreenName>() =>
  useNavigationNative<NavigationProp<RootStackParamList, Name>>();

export default function AppScaffold() {
  const dispatch = useDispatch();
  const hasToken = useSelector(state => state.account.hasToken);
  const currentUser = useSelector(state => state.account.currentUser.data);
  // using theme hook here because react-navigation doesn't take nativebase utility props
  const {colors} = useTheme();

  const filterLogin = (name: ScreenName) =>
    (currentUser === null) === (name === 'LOGIN');

  useEffect(() => {
    if (!hasToken) {
      dispatch(setHasAccessTokenAsync());
    }
    if (hasToken && currentUser === null) {
      dispatch(fetchUser());
    }
  }, [hasToken, currentUser, dispatch]);

  const filteredScreens = (Object.keys(definedScreens) as ScreenName[])
    .filter(filterLogin)
    .map(name => definedScreens[name]);

  return (
    <RootStack.Navigator
      initialRouteName="HOME"
      screenOptions={{
        headerStyle: {backgroundColor: colors.primary.main},
        headerTintColor: colors.primary.contrast,
      }}>
      {filteredScreens}
    </RootStack.Navigator>
  );
}
