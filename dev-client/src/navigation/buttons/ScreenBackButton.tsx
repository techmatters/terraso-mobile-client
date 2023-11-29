import {useCallback} from 'react';
import {useNavigation} from 'terraso-mobile-client/navigation/useNavigation';
import {AppBarIconButton} from 'terraso-mobile-client/navigation/buttons/AppBarIconButton';

export const ScreenBackButton = ({icon = 'arrow-back'}: {icon?: string}) => {
  const navigation = useNavigation();
  const goBack = useCallback(() => navigation.pop(), [navigation]);
  return <AppBarIconButton name={icon} onPress={goBack} />;
};
