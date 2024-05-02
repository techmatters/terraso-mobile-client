import {Button} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {LogoutModal} from 'terraso-mobile-client/components/modals/LogoutModal';

export function LogOutButton() {
  const {t} = useTranslation();

  return (
    <LogoutModal
      trigger={onOpen => (
        <Button
          size="md"
          variant="ghost"
          alignSelf="flex-start"
          _text={{color: 'text.primary', textTransform: 'uppercase'}}
          leftIcon={<Icon name="logout" color="text.primary" />}
          onPress={onOpen}>
          {t('settings.logOut')}
        </Button>
      )}
    />
  );
}
