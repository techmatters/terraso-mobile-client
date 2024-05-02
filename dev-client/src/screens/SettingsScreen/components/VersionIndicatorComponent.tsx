import {useTranslation} from 'react-i18next';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {APP_CONFIG} from 'terraso-mobile-client/config';

export function VersionIndicator() {
  const {t} = useTranslation();

  return (
    <Text variant="body2">
      {APP_CONFIG.version ?? `(${t('settings.unknownVersion')})`}
    </Text>
  );
}
