import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {useLogin} from '../context/LoginContext';
import SCREENS, {LoggedOut} from '.';
import {fetchProjects, SITE_DISPLAYS} from '../dataflow';

const Stack = createNativeStackNavigator<RootStackParamList>();

type ScreenMapArgs = [ScreenRoutes, any];

const previews = fetchProjects();
const sites = SITE_DISPLAYS;

function mapScreens([name, component]: ScreenMapArgs) {
  // TODO: This is a stub that will be removed in connection with backend
  let initialParams;
  switch (name) {
    case 'PROJECT_LIST':
      initialParams = {projects: previews};
      break;
    case 'SITES_MAP':
      initialParams = {sites: sites};
  }
  return (
    <Stack.Screen
      name={name}
      component={component}
      initialParams={initialParams}
      key={name}
    />
  );
}

export default function ScreenDisplay() {
  const {user} = useLogin();

  function filterLogin([name, _]: ScreenMapArgs) {
    if (user === null) {
      return LoggedOut.has(name);
    } else {
      return !LoggedOut.has(name);
    }
  }
  return (
    <Stack.Navigator
      initialRouteName={ScreenRoutes.SITES_MAP}
      screenOptions={{
        headerShown: false,
      }}>
      {(Object.entries(SCREENS) as [ScreenRoutes, any])
        .filter(filterLogin)
        .map(mapScreens)}
    </Stack.Navigator>
  );
}
