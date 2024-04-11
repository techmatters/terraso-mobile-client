import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {Trans, useTranslation} from 'react-i18next';

import {
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SlopeMeterInfoContent = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" pt={5} px={5} mt="48px">
        <Heading w="full" textAlign="left">
          {t('slope.steepness.info.title')}
        </Heading>
        <Text variant="body1">{t('slope.steepness.info.description1')}</Text>
        <Text variant="body1">{t('slope.steepness.info.description2')}</Text>
        <Text variant="body1">{t('slope.steepness.info.description3')}</Text>
        <Text variant="body1">{t('slope.steepness.info.description4')}</Text>
        <Text variant="body1">{t('slope.steepness.info.description5')}</Text>
        <Text variant="body1">
          <Trans i18nKey="slope.steepness.info.description6">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
      </Column>
    </BottomSheetScrollView>
  );
};
