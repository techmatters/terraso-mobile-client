import {Button} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/Icons';

export function LogOutButton() {
  const {t} = useTranslation();

  return (
    <Button
      size="md"
      variant="ghost"
      alignSelf="flex-start"
      _text={{color: 'text.primary'}}
      textTransform={'uppercase'}
      leftIcon={<Icon name="logout" color="text.primary" />}>
      {t('settings.logOut')}
    </Button>
  );
}
