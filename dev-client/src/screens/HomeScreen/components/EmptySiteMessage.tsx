import {Text} from 'native-base';
import {Linking} from 'react-native';
import {Trans, useTranslation} from 'react-i18next';
import {LinkNewWindowIcon} from 'terraso-mobile-client/components/Icons';

export const EmptySiteMessage = () => {
  const {t} = useTranslation();

  return (
    <Text px="17px" variant="body1">
      <Trans
        i18nKey="site.empty.info"
        components={{
          icon: <LinkNewWindowIcon />,
        }}>
        <Text
          underline
          onPress={() => Linking.openURL(t('site.empty.link_url'))}
          color="primary.main">
          link_text
        </Text>
      </Trans>
    </Text>
  );
};
