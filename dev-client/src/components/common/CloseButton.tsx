import {IconButton} from './Icons';
import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {TopLevelNavigationProp} from '../../screens';

export default function CloseButton() {
  const navigation = useNavigation<TopLevelNavigationProp>();
  const onPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  return (
    <IconButton
      name="close"
      _icon={{color: 'primary.contrast'}}
      onPress={onPress}
    />
  );
}
