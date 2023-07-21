import {IconButton} from './Icons';
import {useCallback} from 'react';
import {useNavigation} from '../../screens/AppScaffold';

export default function CloseButton() {
  const navigation = useNavigation();
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
