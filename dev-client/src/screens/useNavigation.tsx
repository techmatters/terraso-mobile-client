import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation as useNavigationNative} from '@react-navigation/native';
import {ScreenName, RootStackParamList} from './types';

export const useNavigation = <Name extends ScreenName = ScreenName>() =>
  useNavigationNative<NativeStackNavigationProp<RootStackParamList, Name>>();
