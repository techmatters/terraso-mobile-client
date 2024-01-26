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

import {useCallback} from 'react';
import {StyleSheet, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Box, Divider, Text, Column, HStack} from 'native-base';

import {SitePrivacy, updateSite} from 'terraso-client-shared/site/siteSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {Accordion} from 'terraso-mobile-client/components/Accordion';
import {StaticMapView} from 'terraso-mobile-client/components/StaticMapView';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {ProjectInstructionsButton} from 'terraso-mobile-client/screens/SiteScreen/components/ProjectInstructionsButton';

import {IconButton} from 'terraso-mobile-client/components/Icons';
import {useInfoPress} from 'terraso-mobile-client/hooks/useInfoPress';

const TEMP_ELEVATION = '1900 ft';
const TEMP_ACCURACY = '20 ft';
const TEMP_MODIFIED_DATE = '8/15/23';
const TEMP_MODIFIED_NAME = 'Sample Sam';
const TEMP_NOT_FOUND = 'not found';
const TEMP_SOIL_ID_VALUE = 'Clifton';
const TEMP_ECO_SITE_PREDICTION = 'Loamy Upland';
const TEMP_LCC_PREDICTION = 'Class 1';
const TEMP_SOIL_ID_CONFIDENCE = '80%';
const TEMP_ECO_SITE_ID_CONFIDENCE = '80%';
const TEMP_LCC_CONFIDENCE = '80%';

type Props = {
  siteId?: string;
  coords?: Coords;
};

const LocationDetail = ({label, value}: {label: string; value: string}) => (
  <Text variant="body1">
    <Text bold>{label}: </Text>
    <Text>{value}</Text>
  </Text>
);

type LocationPredictionProps = {
  label: string;
  prediction: string;
  confidence: string;
};

const LocationPrediction = ({
  label,
  prediction,
  confidence,
}: LocationPredictionProps) => {
  const {t} = useTranslation();

  return (
    <Column backgroundColor="primary.main" alignItems="center" py="18px">
      <Text variant="body1" color="primary.contrast" bold>
        {label}
      </Text>
      <Box h="5px" />
      <Text variant="body2" color="primary.contrast">
        <Text bold>{t('soil.prediction')}: </Text>
        <Text>{prediction}</Text>
      </Text>
      <Text variant="body2" color="primary.contrast">
        <Text bold>{t('soil.confidence')}: </Text>
        <Text>{confidence}</Text>
      </Text>
    </Column>
  );
};

export const SiteScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const onInfoPress = useInfoPress();

  const site = useSelector(state =>
    siteId === undefined ? undefined : state.site.sites[siteId],
  );
  if (coords === undefined) {
    coords = site!;
  }
  const project = useSelector(state =>
    site?.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

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
      <Accordion
        initiallyOpen
        Head={
          <Text variant="body1" color="primary.contrast">
            {t('general.details')}
          </Text>
        }>
        <Box px="16px" py="8px">
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
          <LocationDetail
            label={t('geo.latitude.title')}
            value={coords.latitude.toFixed(6)}
          />
          <LocationDetail
            label={t('geo.longitude.title')}
            value={coords.longitude.toFixed(6)}
          />
          <LocationDetail
            label={t('geo.elevation.title')}
            value={TEMP_ELEVATION}
          />
          {site && (
            <>
              <LocationDetail
                label={t('site.dashboard.location_accuracy')}
                value={TEMP_ACCURACY}
              />
              <LocationDetail
                label={t('soil.bedrock')}
                value={TEMP_NOT_FOUND}
              />
              <LocationDetail
                label={t('site.dashboard.last_modified.label')}
                value={t('site.dashboard.last_modified.value', {
                  date: TEMP_MODIFIED_DATE,
                  name: TEMP_MODIFIED_NAME,
                })}
              />
            </>
          )}
          {project?.siteInstructions && (
            <ProjectInstructionsButton project={project} />
          )}
        </Box>
      </Accordion>
      <Divider />
      <Column space="20px" padding="16px">
        <LocationPrediction
          label={t('soil.soil_id').toUpperCase()}
          prediction={TEMP_SOIL_ID_VALUE}
          confidence={TEMP_SOIL_ID_CONFIDENCE}
        />
        <LocationPrediction
          label={t('soil.ecological_site_id').toUpperCase()}
          prediction={TEMP_ECO_SITE_PREDICTION}
          confidence={TEMP_ECO_SITE_ID_CONFIDENCE}
        />
        <LocationPrediction
          label={t('soil.land_capability_classification').toUpperCase()}
          prediction={TEMP_LCC_PREDICTION}
          confidence={TEMP_LCC_CONFIDENCE}
        />
      </Column>
    </ScrollView>
  );
};

const styles = StyleSheet.create({mapView: {height: 170}});
