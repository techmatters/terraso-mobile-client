import {Button} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/Icons';

export function DeleteAccountButton() {
  const {t} = useTranslation();

  return (
    <Button
      size="md"
      variant="ghost"
      alignSelf="flex-start"
      _text={{color: 'error.main', textTransform: 'uppercase'}}
      _pressed={{backgroundColor: 'red.100'}}
      leftIcon={<Icon name="delete" color="error.main" />}>
      {t('settings.deleteAccount')}
    </Button>
  );
}
