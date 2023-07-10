import {
  NativeStackNavigationOptions,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import SCREENS, {ScreenConfig} from '.';
import {fetchProjects, SITE_DISPLAYS} from '../dataflow';
import {useTranslation} from 'react-i18next';
import {TFunction} from 'i18next';
import {useTheme} from 'native-base';
import {useDispatch, useSelector} from '../model/store';
import {useEffect} from 'react';
import {
  setHasAccessTokenAsync,
  fetchUser,
} from 'terraso-client-shared/account/accountSlice';

const Stack = createNativeStackNavigator<RootStackParamList>();

type ScreenMapArgs = [ScreenRoutes, ScreenConfig<keyof RootStackParamList>];

const previews = fetchProjects();
const sites = SITE_DISPLAYS;

function mapScreens(t: TFunction) {
  return ([name, config]: ScreenMapArgs) => {
    // TODO: initialParams are stubs, a stopgap for while we are not connected to the backend
    // This setup should be changed when we get to connecting the backend
    let initialParams;
    switch (name) {
      case 'PROJECT_LIST':
        initialParams = {projects: previews};
        break;
    }

    let options: NativeStackNavigationOptions = {};

    if (config.hideBack) {
      options.headerBackVisible = false;
    }

    options.headerLeft = config.leftIcon;
    options.headerRight = config.rightIcon;

    return (
      <Stack.Screen
        name={name}
        component={config.screen}
        initialParams={initialParams}
        key={name}
        options={({route}) => {
          if (config.paramTitle !== undefined) {
            options.headerTitle = config.paramTitle({t, route});
          } else {
            options.headerTitle = t('screens.' + name) ?? undefined;
          }
          return options;
        }}
      />
    );
  };
}

export default function AppScaffold() {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const hasToken = useSelector(state => state.account.hasToken);
  const currentUser = useSelector(state => state.account.currentUser.data);
  // using theme hook here because react-navigation doesn't take nativebase utility props
  const {colors} = useTheme();

  function filterLogin([_name, config]: ScreenMapArgs) {
    if (currentUser === null) {
      return config.loggedOut === true;
    } else {
      return config.loggedOut !== true;
    }
  }

  useEffect(() => {
    if (!hasToken) {
      dispatch(setHasAccessTokenAsync());
    }
    if (hasToken && currentUser === null) {
      dispatch(fetchUser());
    }
  }, [hasToken, currentUser, dispatch]);

  return (
    <Stack.Navigator
      initialRouteName={ScreenRoutes.SITES_MAP}
      screenOptions={{
        headerStyle: {backgroundColor: colors.primary.main},
        headerTintColor: colors.primary.contrast,
      }}>
      {(Object.entries(SCREENS) as ScreenMapArgs[])
        .filter(filterLogin)
        .map(mapScreens(t))}
    </Stack.Navigator>
  );
}
