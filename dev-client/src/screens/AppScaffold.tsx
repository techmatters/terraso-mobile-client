import {
  NativeStackNavigationOptions,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {useLogin} from '../context/LoginContext';
import SCREENS, {ScreenConfig} from '.';
import {fetchProjects, SITE_DISPLAYS} from '../dataflow';
import {useTranslation} from 'react-i18next';
import {TFunction} from 'i18next';
import {useTheme} from 'native-base';

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
      case 'SITES_MAP':
        initialParams = {sites: sites};
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
  const {user} = useLogin();
  const {t} = useTranslation();
  // using theme hook here because react-navigation doesn't take nativebase utility props
  const {colors} = useTheme();

  function filterLogin([_name, config]: ScreenMapArgs) {
    if (user === null) {
      return config.loggedOut === true;
    } else {
      return config.loggedOut !== true;
    }
  }

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
