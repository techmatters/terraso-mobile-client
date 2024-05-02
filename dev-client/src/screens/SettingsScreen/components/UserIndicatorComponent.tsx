import {useTranslation} from 'react-i18next';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSelector} from 'terraso-mobile-client/store';

export function UserIndicator() {
  const currentUser = useSelector(state => state.account.currentUser.data);
  const {t} = useTranslation();

  return (
    <Text variant="body1">
      {currentUser?.email ?? t('settings.unknownUser')}
    </Text>
  );
}
