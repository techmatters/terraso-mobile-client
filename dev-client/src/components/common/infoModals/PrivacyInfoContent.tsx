import {Column, Heading, Text} from 'native-base';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {Linking} from 'react-native';
import {Trans, useTranslation} from 'react-i18next';
import {HorizontalIconButton} from 'terraso-mobile-client/components/common/Icons';

export const PrivacyInfoContent = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" pt={5} px={5} mt="48px">
        <Heading w="full" textAlign="left">
          {t('general.info.privacy_title')}
        </Heading>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item1">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item2">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <HorizontalIconButton
          name={'open-in-new'}
          label={t('general.info.data_portal_link_text')}
          isUppercase={true}
          onPress={() =>
            Linking.openURL(t('general.info.data_portal_link_url'))
          }
        />
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item3">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item4">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item5">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item6">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <HorizontalIconButton
          name={'open-in-new'}
          label={"t('general.info.privacy_policy_link_text')"}
          isUppercase={true}
          onPress={() =>
            Linking.openURL(t('general.info.privacy_policy_link_url'))
          }
        />
      </Column>
    </BottomSheetScrollView>
  );
};
