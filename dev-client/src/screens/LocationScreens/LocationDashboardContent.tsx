/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, StyleSheet} from 'react-native';

import {Button} from 'native-base';

import {SitePrivacy, updateSite} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-client-shared/types';

import StackedBarChart from 'terraso-mobile-client/assets/stacked-bar.svg';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {
  Box,
  Column,
  HStack,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {PeopleBadge} from 'terraso-mobile-client/components/PeopleBadge';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {StaticMapView} from 'terraso-mobile-client/components/StaticMapView';
import {renderElevation} from 'terraso-mobile-client/components/util/site';
import {useSoilIdData} from 'terraso-mobile-client/hooks/soilIdHooks';
import {useInfoPress} from 'terraso-mobile-client/hooks/useInfoPress';
import {getTopMatch} from 'terraso-mobile-client/model/soilId/soilIdRanking';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {ProjectInstructionsButton} from 'terraso-mobile-client/screens/LocationScreens/components/ProjectInstructionsButton';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  siteId?: string;
  coords?: Coords;
  elevation?: number;
};

const LocationDetail = ({label, value}: {label: string; value: string}) => (
  <Text variant="body1" mb={1}>
    <Text bold>{label}: </Text>
    <Text>{value}</Text>
  </Text>
);

type LocationPredictionProps = {
  label: string;
  soilName: string;
  ecologicalSiteName?: string;
  onExploreDataPress: () => void;
};

const LocationPrediction = ({
  label,
  soilName,
  ecologicalSiteName,
  onExploreDataPress,
}: LocationPredictionProps) => {
  const {t} = useTranslation();

  return (
    <Box
      variant="tile"
      flexDirection="column"
      alignItems="flex-start"
      py="18px"
      pl="16px">
      <Row alignItems="center">
        <Box mr={15}>
          <StackedBarChart />
        </Box>
        <Text
          variant="body1"
          color="primary.lighter"
          textTransform="uppercase"
          bold>
          {label}
        </Text>
      </Row>
      <Box h="15px" />
      <Text variant="body1" color="primary.contrast" mb="5px">
        <Text bold>{t('soil.top_match')}: </Text>
        <Text>{soilName ?? t('site.soil_id.soil_info.no_matches')}</Text>
      </Text>
      <Text variant="body1" color="primary.contrast" mb="25px">
        <Text bold>{t('soil.ecological_site_name')}: </Text>
        <Text>
          {ecologicalSiteName ?? t('site.soil_id.soil_info.no_matches')}
        </Text>
      </Text>

      <Button
        w="95%"
        _text={{textTransform: 'uppercase'}}
        rightIcon={<Icon name="chevron-right" />}
        onPress={onExploreDataPress}>
        {t('soil.explore_data')}
      </Button>
    </Box>
  );
};

export const LocationDashboardContent = ({
  siteId,
  coords,
  elevation,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const onInfoPress = useInfoPress();
  const navigation = useNavigation();

  const site = useSelector(state =>
    siteId === undefined ? undefined : state.site.sites[siteId],
  );
  if (coords === undefined) {
    coords = site!;
  }
  if (elevation === undefined) {
    elevation = site?.elevation ?? undefined;
  }
  const project = useSelector(state =>
    site?.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const soilIdData = useSoilIdData(coords, siteId);
  const topSoilMatch = useMemo(() => getTopMatch(soilIdData), [soilIdData]);

  const onExploreDataPress = useCallback(() => {
    navigation.navigate('LOCATION_SOIL_ID', {siteId, coords});
  }, [navigation, siteId, coords]);

  const onSitePrivacyChanged = useCallback(
    (privacy: SitePrivacy) => dispatch(updateSite({id: site!.id, privacy})),
    [site, dispatch],
  );

  return (
    <ScrollView>
      <StaticMapView
        coords={coords}
        style={styles.mapView}
        displayCenterMarker={true}
      />
      <Box px="16px" py="16px">
        <LocationDetail
          label={t('geo.latitude.title')}
          value={coords?.latitude.toFixed(6)}
        />
        <LocationDetail
          label={t('geo.longitude.title')}
          value={coords?.longitude.toFixed(6)}
        />
        <LocationDetail
          label={t('geo.elevation.title')}
          value={renderElevation(t, elevation)}
        />
        {!site && (
          <Box>
            <Box paddingVertical="20px">
              <CreateSiteButton coords={coords} />
            </Box>
            <Text variant="body1">{t('site.create.description')}</Text>
          </Box>
        )}
        {project && (
          <LocationDetail label={t('projects.label')} value={project.name} />
        )}
        {project && (
          <LocationDetail
            label={t('site.dashboard.privacy')}
            value={t(`privacy.${project.privacy.toLowerCase()}.title`)}
          />
        )}
        {site && !project && (
          <HStack>
            <RadioBlock
              label={
                <HStack>
                  <Text variant="body1" bold>
                    {t('site.dashboard.privacy')}
                  </Text>
                  <IconButton
                    pt={0}
                    pb={0}
                    pl={2}
                    size="md"
                    name="info"
                    onPress={onInfoPress}
                    _icon={{color: 'primary'}}
                  />
                </HStack>
              }
              options={{
                PUBLIC: {text: t('privacy.public.title')},
                PRIVATE: {text: t('privacy.private.title')},
              }}
              groupProps={{
                name: 'site-privacy',
                onChange: onSitePrivacyChanged,
                value: site.privacy,
                ml: '0',
              }}
            />
          </HStack>
        )}
        {project && (
          <HStack space={4} alignItems="baseline">
            <PeopleBadge count={Object.keys(project.memberships).length} />
            {project?.siteInstructions && (
              <ProjectInstructionsButton project={project} />
            )}
          </HStack>
        )}
      </Box>
      <Column space="20px" padding="16px">
        {topSoilMatch && (
          <LocationPrediction
            label={t('soil.soil_id')}
            soilName={topSoilMatch.soilInfo.soilSeries.name}
            ecologicalSiteName={topSoilMatch.soilInfo.ecologicalSite?.name}
            onExploreDataPress={onExploreDataPress}
          />
        )}
      </Column>
    </ScrollView>
  );
};

const styles = StyleSheet.create({mapView: {height: 170}});
