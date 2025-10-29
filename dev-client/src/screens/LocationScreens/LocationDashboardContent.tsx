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

import {ReactNode, useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ScrollView} from 'native-base';

import {Site, SitePrivacy} from 'terraso-client-shared/site/siteTypes';
import {Coords} from 'terraso-client-shared/types';

import {CreateSiteHereButton} from 'terraso-mobile-client/components/buttons/special/CreateSiteHereButton';
import {PeopleChip} from 'terraso-mobile-client/components/chips/PeopleChip';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {DataPrivacyInfoButton} from 'terraso-mobile-client/components/content/info/privacy/DataPrivacyInfoButton';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {StaticMapView} from 'terraso-mobile-client/components/StaticMapView';
import {renderElevation} from 'terraso-mobile-client/components/util/site';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {updateSite} from 'terraso-mobile-client/model/site/siteGlobalReducer';
import {SiteTabJump} from 'terraso-mobile-client/navigation/components/SiteTabJump';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {LocationSoilIdCard} from 'terraso-mobile-client/screens/LocationScreens/components/LocationSoilIdCard';
import {PinnedNoteButton} from 'terraso-mobile-client/screens/LocationScreens/components/PinnedNoteButton';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {formatCoordinate} from 'terraso-mobile-client/util';

type Props = {
  coords: Coords;
  elevation: number | undefined;
  site?: Site;
};

const LocationDetail = ({
  label,
  value,
  affix,
}: {
  label: string;
  value: string;
  affix?: ReactNode;
}) => (
  <Box mb={1} style={styles.detailView}>
    <Text bold>{label}: </Text>
    <Text>{value}</Text>
    {affix}
  </Box>
);

export const LocationDashboardContent = ({site, coords, elevation}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const project = useSelector(state =>
    site?.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onExploreDataPress = useCallback(() => {
    if (site?.id) {
      navigation.navigate('SITE_LOCATION_SOIL_ID', {siteId: site.id, coords});
    } else {
      navigation.navigate('TEMPORARY_LOCATION_SOIL_ID', {coords});
    }
  }, [navigation, site, coords]);

  const onSitePrivacyChanged = useCallback(
    (privacy: SitePrivacy) => dispatch(updateSite({id: site!.id, privacy})),
    [site, dispatch],
  );

  const isOffline = useIsOffline();

  const scrollContentStyle = useMemo(
    () => ({
      paddingBottom: Math.max(insets.bottom, 16),
    }),
    [insets.bottom],
  );

  return (
    <ScrollView
      backgroundColor="background.default"
      contentContainerStyle={scrollContentStyle}>
      <SiteTabJump />
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
            <Box paddingVertical="20px" alignItems="center">
              <CreateSiteHereButton
                coords={coords}
                elevation={elevation}
                creationMethod="map"
              />
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
            affix={
              <Box>
                <HelpContentSpacer />
                <DataPrivacyInfoButton />
              </Box>
            }
          />
        )}
        {site && !project && (
          <Row>
            <RadioBlock
              allDisabled={isOffline}
              label={
                <Row alignItems="center">
                  <Text variant="body1" bold>
                    {t('site.dashboard.privacy')}
                  </Text>
                  <HelpContentSpacer />
                  <DataPrivacyInfoButton />
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
                variant: 'oneLine',
              }}
            />
          </Row>
        )}
        {project && (
          <Row space={4} alignItems="center">
            <PeopleChip count={Object.keys(project.memberships).length} />
            {project?.siteInstructions && (
              <PinnedNoteButton project={project} />
            )}
          </Row>
        )}
      </Box>
      <Column space="20px" padding="16px">
        <LocationSoilIdCard
          coords={coords}
          siteId={site?.id}
          onExploreDataPress={onExploreDataPress}
        />
      </Column>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  mapView: {height: 170, width: '100%'},
  detailView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
