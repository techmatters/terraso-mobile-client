import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {Trans, useTranslation} from 'react-i18next';

import {
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SlopeInfoContent = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" pt={5} px={5} mt="48px">
        <Heading w="full" textAlign="left">
          {t('slope.info.title')}
        </Heading>
        <Text variant="body1">
          <Trans i18nKey="slope.info.description1">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="slope.info.description2">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="slope.info.description3">
            <Text bold>first</Text>
            <Text>second</Text>
          </Trans>
        </Text>
      </Column>
    </BottomSheetScrollView>
  );
};
