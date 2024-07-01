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
import {StyleSheet} from 'react-native';

import {Button, ScrollView} from 'native-base';

import {SitePrivacy, updateSite} from 'terraso-client-shared/site/siteSlice';
import {useSoilIdData} from 'terraso-client-shared/soilId/soilIdHooks';
import {Coords} from 'terraso-client-shared/types';

import StackedBarChart from 'terraso-mobile-client/assets/stacked-bar.svg';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {PeopleBadge} from 'terraso-mobile-client/components/PeopleBadge';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {DataPrivacyInfoSheetButton} from 'terraso-mobile-client/components/sheets/privacy/DataPrivacyInfoSheetButton';
import {StaticMapView} from 'terraso-mobile-client/components/StaticMapView';
import {renderElevation} from 'terraso-mobile-client/components/util/site';
import {getTopMatch} from 'terraso-mobile-client/model/soilId/soilIdRanking';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {ProjectInstructionsButton} from 'terraso-mobile-client/screens/LocationScreens/components/ProjectInstructionsButton';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {formatCoordinate} from 'terraso-mobile-client/util';

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
  coords: Coords;
  siteId?: string;
  onExploreDataPress: () => void;
};

const LocationPrediction = ({
  label,
  coords,
  siteId,
  onExploreDataPress,
}: LocationPredictionProps) => {
  const {t} = useTranslation();

  const soilIdData = useSoilIdData(coords, siteId);
  const topSoilMatch = useMemo(() => getTopMatch(soilIdData), [soilIdData]);

  // TODO-cknipe: I feel like this should be extracted so multiple things can use it
  let soilIdMatchText: string;
  let ecologicalSiteText: string;
  if (soilIdData.status === 'loading') {
    soilIdMatchText = t('soil.loading');
    ecologicalSiteText = t('soil.loading');
  } else if (soilIdData.status === 'DATA_UNAVAILABLE') {
    soilIdMatchText = t('soil.no_matches');
    ecologicalSiteText = t('soil.no_matches');
  } else if (soilIdData.status === 'ready') {
    soilIdMatchText =
      topSoilMatch?.soilInfo.soilSeries.name ?? t('soil.no_matches');
    ecologicalSiteText =
      topSoilMatch?.soilInfo.ecologicalSite?.name ?? t('soil.no_matches');
  } else {
    soilIdMatchText = t('soil.error');
    ecologicalSiteText = t('soil.error');
  }

  return (
    <Box variant="tile" flexDirection="column" alignItems="flex-start" p="18px">
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
        <Text>{soilIdMatchText}</Text>
      </Text>
      <Text variant="body1" color="primary.contrast" mb="25px">
        <Text bold>{t('soil.ecological_site_name')}: </Text>
        <Text>{ecologicalSiteText}</Text>
      </Text>

      <Button
        w="100%"
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

  const onExploreDataPress = useCallback(() => {
    navigation.navigate('LOCATION_SOIL_ID', {siteId, coords});
  }, [navigation, siteId, coords]);

  const onSitePrivacyChanged = useCallback(
    (privacy: SitePrivacy) => dispatch(updateSite({id: site!.id, privacy})),
    [site, dispatch],
  );

  return (
    <ScrollView backgroundColor="background.default">
      <StaticMapView
        coords={coords}
        style={styles.mapView}
        displayCenterMarker={true}
      />
      <Box px="16px" py="16px">
        <LocationDetail
          label={t('geo.latitude.title')}
          value={formatCoordinate(coords?.latitude)}
        />
        <LocationDetail
          label={t('geo.longitude.title')}
          value={formatCoordinate(coords?.longitude)}
        />
        <LocationDetail
          label={t('geo.elevation.title')}
          value={renderElevation(t, elevation)}
        />
        {!site && (
          <Box>
            <Box paddingVertical="20px">
              <CreateSiteButton coords={coords} elevation={elevation} />
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
          <Row>
            <RadioBlock
              label={
                <Row>
                  <Text variant="body1" bold>
                    {t('site.dashboard.privacy')}
                  </Text>
                  <DataPrivacyInfoSheetButton />
                </Row>
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
          </Row>
        )}
        {project && (
          <Row space={4} alignItems="baseline">
            <PeopleBadge count={Object.keys(project.memberships).length} />
            {project?.siteInstructions && (
              <ProjectInstructionsButton project={project} />
            )}
          </Row>
        )}
      </Box>
      <Column space="20px" padding="16px">
        <LocationPrediction
          label={t('soil.soil_id')}
          coords={coords}
          siteId={siteId}
          onExploreDataPress={onExploreDataPress}
        />
      </Column>
    </ScrollView>
  );
};

const styles = StyleSheet.create({mapView: {height: 170}});
