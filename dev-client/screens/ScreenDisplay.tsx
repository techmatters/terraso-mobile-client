import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {useLogin} from '../context/LoginContext';
import SCREENS, {LoggedOut} from '.';
import AppBar from '../components/AppBar';

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

const INITIAL_PARAMS: RootStackParamList = {
  LOGIN: undefined,
  PROJECT_LIST: {
    projects: [{name: 'Test Project'}],
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
