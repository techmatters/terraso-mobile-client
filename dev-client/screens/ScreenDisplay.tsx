import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {useLogin} from '../context/LoginContext';
import SCREENS, {LoggedOut} from '.';
import AppBar from '../components/AppBar';
import {fetchProjects} from '../dataflow';

const Stack = createNativeStackNavigator<RootStackParamList>();

type ScreenMapArgs = [ScreenRoutes, any];

function mapScreens([name, component]: ScreenMapArgs) {
  return (
    <Stack.Screen
      name={name}
      component={component}
      initialParams={INITIAL_PARAMS[name]}
      key={name}
      options={({route}) => ({
        headerTitle: props => <AppBar />,
      })}
    />
  );
}

const previews = fetchProjects();

/* TODO: I don't think initial params are necesssary for all screens, let's figure out how to modify this*/
const INITIAL_PARAMS: RootStackParamList = {
  LOGIN: undefined,
  PROJECT_LIST: {
    projects: previews,
  },
  PROJECT_VIEW: {
    project: {
      meta: previews[0],
    },
  },
};

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
      initialRouteName={ScreenRoutes.LOGIN}
      screenOptions={{
        headerShown: false,
      }}>
      {(Object.entries(SCREENS) as [ScreenRoutes, any])
        .filter(filterLogin)
        .map(mapScreens)}
    </Stack.Navigator>
  );
}
