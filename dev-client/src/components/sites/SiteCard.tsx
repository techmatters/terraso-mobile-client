import {useNavigation} from '../../screens/AppScaffold';
import {Box, Flex, Heading, Text, Badge} from 'native-base';
import {useCallback} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import {Pressable} from 'react-native';
import {Icon, IconButton} from '../common/Icons';

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

  const onTitlePress = useCallback(
    () => navigation.navigate('LOCATION_DASHBOARD', {siteId: site.id}),
    [navigation, site.id],
  );

  return (
    <Box>
      <Box variant="card">
        <Pressable onPress={onTitlePress}>
          <Heading variant="h6" color="primary.main">
            {site.name}
          </Heading>
        </Pressable>
        {project && <Heading size="md">{project.name}</Heading>}
        <Text variant="subtitle2" color="text.secondary">
          {t('site.last_updated', {
            date: '14-08-2023',
            name: 'Sam',
          })}
        </Text>
        <Flex direction="row" alignItems="center">
          <Icon name="photo" size="60px" />
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
        </Flex>
      </Box>
      <Box position="absolute" top="8px" right="8px">
        {topRightButton}
      </Box>
    </Box>
  );
};
