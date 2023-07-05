import MaterialIconButton from './MaterialIconButton';
import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {TopLevelNavigationProp} from '../../screens';

export default function CloseButton() {
  const navigation = useNavigation<TopLevelNavigationProp>();
  const onPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  return (
    <MaterialIconButton
      name="close"
      iconProps={{color: 'primary.contrast'}}
      onPress={onPress}
    />
  );
}
