import {Text} from 'native-base';
import {useTranslation} from 'react-i18next';

// TODO: add real props instead of placeholder
export const LastModified = () => {
  const {t} = useTranslation();
  return (
    <Text variant="body2" fontStyle="italic">
      {t('general.last_modified_by', {user: 'Sample Sam', date: '2023-08-16'})}
    </Text>
  );
};
