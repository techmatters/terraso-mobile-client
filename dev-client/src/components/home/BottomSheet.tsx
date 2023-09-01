import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {
  Box,
  Button,
  Row,
  Heading,
  Text,
  VStack,
  Link,
  Image,
  useTheme,
} from 'native-base';
import {forwardRef, useCallback, useMemo} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Trans, useTranslation} from 'react-i18next';
import {Icon} from '../common/Icons';
import {SiteCard} from '../sites/SiteCard';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';

const LandPKSInfo = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <VStack space={3} pb="65%" px={5}>
        <Heading>{t('site.empty.title')}</Heading>
        <Image
          source={require('../../assets/landpks_intro_image.png')}
          width="100%"
          height="30%"
          resizeMode="contain"
          alt={t('site.empty.intro_image_alt')}
        />
        <Text>
          <Text bold>{t('site.empty.description.lead')} </Text>
          {t('site.empty.description.body')}
        </Text>
        <Text alignItems="center">
          <Text bold>{t('site.empty.location.lead')} </Text>
          <Trans
            i18nKey="site.empty.location.body"
            components={{
              icon: (
                <Icon
                  name="my-location"
                  color="action.active"
                  position="relative"
                />
              ),
            }}
          />
        </Text>
        <Text>
          <Text bold>{t('site.empty.search.lead')} </Text>
          {t('site.empty.search.body')}
        </Text>
        <Text>
          <Text bold>{t('site.empty.learn_more.lead')} </Text>
          <Trans
            i18nKey="site.empty.learn_more.body"
            components={{
              // note: "link" is a reserved word for the Trans component, cannot use as key here
              // see https://react.i18next.com/latest/trans-component#alternative-usage-which-lists-the-components-v11.6.0
              landpks: (
                <Link
                  _text={{
                    color: 'primary.main',
                    fontSize: 'sm',
                  }}
                  isExternal
                  pt={2}
                />
              ),
            }}
          />
        </Text>
      </VStack>
    </BottomSheetScrollView>
  );
};

type Props = {
  sites: Record<string, Site>;
  showSiteOnMap: (site: Site) => void;
  onCreateSite: () => void;
};
export const SiteListBottomSheet = forwardRef<BottomSheetMethods, Props>(
  ({sites, showSiteOnMap, onCreateSite}, ref) => {
    const {t} = useTranslation();

    const siteList = useMemo(() => Object.values(sites), [sites]);

    const renderSite = useCallback(
      ({item}: {item: Site}) => (
        <SiteCard site={item} onShowSiteOnMap={showSiteOnMap} />
      ),
      [showSiteOnMap],
    );

    const snapPoints = useMemo(
      () => ['15%', siteList.length === 0 ? '50%' : '75%', '100%'],
      [siteList.length],
    );

    const {colors} = useTheme();
    const listStyle = useMemo(() => ({paddingHorizontal: 16}), []);
    const backgroundStyle = useMemo(
      () => ({backgroundColor: colors.grey[300]}),
      [colors],
    );

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={{backgroundColor: colors.grey[800]}}>
        <Row
          justifyContent="space-between"
          alignItems="center"
          paddingBottom="4"
          paddingX="16px">
          <Heading variant="h6">{t('site.list_title')}</Heading>
          <Button
            size="sm"
            onPress={onCreateSite}
            startIcon={<Icon name="add" />}>
            {t('site.create.title').toUpperCase()}
          </Button>
        </Row>
        {siteList.length === 0 ? (
          <LandPKSInfo />
        ) : (
          <BottomSheetFlatList
            style={listStyle}
            data={siteList}
            keyExtractor={site => site.id}
            renderItem={renderSite}
            ItemSeparatorComponent={() => <Box height="8px" />}
            ListFooterComponent={<Box height="10px" />}
          />
        )}
      </BottomSheet>
    );
  },
);
