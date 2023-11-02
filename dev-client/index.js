/**
 * @format
 */
import 'terraso-mobile-client/prelude';
import {AppRegistry} from 'react-native';
import App from 'terraso-mobile-client/App';
import {name as appName} from './app.json'; // eslint-disable-line @typescript-eslint/no-restricted-imports

AppRegistry.registerComponent(appName, () => App);
