import {Linking} from 'react-native';
import {Column, FlatList, Heading, HStack, Image, Text} from 'native-base';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {Trans, useTranslation} from 'react-i18next';
import {
  LocationIcon,
  LinkNewWindowIcon,
} from 'terraso-mobile-client/components/Icons';

export const LandPKSInfo = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" pt={5} px={5} mt="48px">
        <Heading w="full" textAlign="center">
          {t('home.info.title')}
        </Heading>
        <Image
          source={require('terraso-mobile-client/assets/landpks_intro_image.png')}
          w="100%"
          h="25%"
          resizeMode="contain"
          alt={t('home.info.intro_image_alt')}
        />
        <Text variant="body1">
          <Trans i18nKey="home.info.description">
            <Text bold>first</Text>
            <Text>second</Text>
            <Text bold>third</Text>
          </Trans>
        </Text>
        <FlatList
          data={['home.info.list1', 'home.info.list2', 'home.info.list3']}
          renderItem={({index, item}) => (
            <HStack key={index}>
              <Text variant="body1" mr={2}>
                {index + 1}
                {'.'}
              </Text>
              <Text variant="body1" mr={2}>
                <Trans i18nKey={item} components={{icon: <LocationIcon />}} />
              </Text>
            </HStack>
          )}
          keyExtractor={item => item}
        />
        <Text variant="body1">
          <Trans
            i18nKey="home.info.description2"
            components={{
              icon: <LinkNewWindowIcon />,
            }}>
            <Text bold>first</Text>
            <Text
              underline
              onPress={() => Linking.openURL(t('home.info.link_url'))}
              color="primary.main">
              link_text
            </Text>
          </Trans>
        </Text>
      </Column>
    </BottomSheetScrollView>
  );
};
