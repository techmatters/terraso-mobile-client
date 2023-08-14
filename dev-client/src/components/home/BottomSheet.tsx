import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {useNavigation} from '../../screens/AppScaffold';
import {Box, Button, Flex, Heading, Text, useTheme} from 'native-base';
import {useCallback, useMemo} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useTranslation} from 'react-i18next';
import {Icon} from '../common/Icons';
import {SiteCard} from '../sites/SiteCard';

type Props = {
  sites: Record<string, Site>;
  showSiteOnMap: (site: Site) => void;
};
const SiteListBottomSheet = ({sites, showSiteOnMap}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

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

  const addSiteCallback = useCallback(() => {
    navigation.navigate('CREATE_SITE');
  }, [navigation]);

  const {colors} = useTheme();
  const style = useMemo(() => ({paddingHorizontal: 16}), []);
  const backgroundStyle = useMemo(
    () => ({backgroundColor: colors.grey[300]}),
    [colors],
  );

  return (
    <BottomSheet
      snapPoints={snapPoints}
      backgroundStyle={backgroundStyle}
      style={style}
      handleIndicatorStyle={{backgroundColor: colors.grey[800]}}>
      <Box paddingX="4px">
        <Flex
          direction="row"
          justify="space-between"
          align="center"
          paddingBottom="4">
          <Heading variant="h6">{t('site.list_title')}</Heading>
          <Button
            size="sm"
            onPress={addSiteCallback}
            startIcon={<Icon name="add" />}>
            {t('site.create')}
          </Button>
        </Flex>
        {siteList.length === 0 && (
          <Text fontSize="md">{t('site.none_in_list')}</Text>
        )}
      </Box>
      <BottomSheetFlatList
        data={siteList}
        keyExtractor={site => site.id}
        renderItem={renderSite}
        ItemSeparatorComponent={() => <Box height="8px" />}
      />
    </BottomSheet>
  );
};

export default SiteListBottomSheet;
