import {useNavigation} from '../../screens/AppScaffold';
import {Box, Heading, Text, Badge, Row} from 'native-base';
import {useCallback} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import {Pressable, StyleSheet} from 'react-native';
import {Icon, IconButton} from '../common/Icons';
import {StaticMapView} from '../common/Map';
import {Card} from '../common/Card';

const TEMP_MODIFIED_DATE = '8/15/23';
const TEMP_MODIFIED_NAME = 'Sample Sam';

type SiteCardProps = {
  site: Site;
  onShowSiteOnMap?: (site: Site) => void;
  topRightButton?: React.ReactElement;
};
export const SiteCard = ({
  site,
  onShowSiteOnMap,
  topRightButton,
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
    <Pressable onPress={onCardPress}>
      <Card topRightButton={topRightButton}>
        <Heading variant="h6" color="primary.main">
          {site.name}
        </Heading>
        {project && <Heading size="md">{project.name}</Heading>}
        <Text variant="subtitle2" color="text.secondary">
          {t('site.last_updated', {
            date: TEMP_MODIFIED_DATE,
            name: TEMP_MODIFIED_NAME,
          })}
        </Text>
        <Box height="16px" />
        <Row alignItems="center">
          <StaticMapView coords={site} style={styles.mapView} />
          <Box width="4" />
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
    </Pressable>
  );
};

const styles = StyleSheet.create({mapView: {height: 60, width: 60}});
