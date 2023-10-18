import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {Box, Heading, Text, Badge, Row} from 'native-base';
import {useCallback} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useSelector} from 'terraso-mobile-client/model/store';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {StaticMapView} from 'terraso-mobile-client/components/common/Map';
import {Card} from 'terraso-mobile-client/components/common/Card';

const TEMP_MODIFIED_DATE = '8/15/23';
const TEMP_MODIFIED_NAME = 'Sample Sam';

type SiteCardProps = {
  site: Site;
  onShowSiteOnMap?: (site: Site) => void;
  buttons?: React.ReactNode;
  isPopover: boolean;
};
export const SiteCard = ({
  site,
  onShowSiteOnMap,
  buttons,
  isPopover,
}: SiteCardProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onCardPress = useCallback(
    () => navigation.navigate('LOCATION_DASHBOARD', {siteId: site.id}),
    [navigation, site.id],
  );

  return (
    <Card onPress={onCardPress} buttons={buttons} isPopover={isPopover}>
      <Heading
        variant="h6"
        color="primary.main"
        style={isPopover ? styles.popoverHeader : {}}>
        {site.name}
      </Heading>
      {project && <Heading size="md">{project.name}</Heading>}
      <Text variant="subtitle2" color="text.secondary">
        {t('site.last_updated', {
          date: TEMP_MODIFIED_DATE,
          name: TEMP_MODIFIED_NAME,
        })}
      </Text>
      <Box h="16px" />
      <Row alignItems="center">
        <StaticMapView coords={site} style={styles.mapView} />
        <Box w="4" />
        <Badge
          variant="chip"
          backgroundColor="primary.lightest"
          startIcon={<Icon name="people" />}>
          1
        </Badge>
        <Box flexGrow="1" />
        {onShowSiteOnMap && (
          <IconButton
            name="location-on"
            variant="outline"
            rounded="full"
            borderColor="secondary.main"
            _icon={{
              color: 'secondary.main',
            }}
            onPress={() => onShowSiteOnMap(site)}
          />
        )}
      </Row>
    </Card>
  );
};

const styles = StyleSheet.create({
  mapView: {height: 60, width: 60},
  popoverHeader: {
    paddingRight: 30,
  },
});
