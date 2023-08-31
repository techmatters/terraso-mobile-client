import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {Box, Button, Row, Heading, Text, Link, useTheme} from 'native-base';
import {forwardRef, useCallback, useMemo} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useTranslation} from 'react-i18next';
import {Icon} from '../common/Icons';
import {SiteCard} from '../sites/SiteCard';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';

const EmptySiteMessage = () => {
  const {t} = useTranslation();

  return (
    <Text px="17px" variant="body1">
      <Text>{t('site.empty.info')}</Text>
      <Text>{'\n\n'}</Text>
      <Link isUnderlined={false} _text={{variant: 'body1'}}>
        {t('site.empty.link') + ' '}
        <Icon name="open-in-new" />
      </Link>
    </Text>
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
          <EmptySiteMessage />
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
