import {useNavigation} from '../../screens/AppScaffold';
import {useDispatch, useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import RadioBlock from '../common/RadioBlock';
import {
  Site,
  SitePrivacy,
  updateSite,
} from 'terraso-client-shared/site/siteSlice';
import {useCallback, useMemo} from 'react';
import {Box, Divider, Text, Column} from 'native-base';
import {
  AppBar,
  AppBarIconButton,
  ScreenCloseButton,
  ScreenScaffold,
} from '../../screens/ScreenScaffold';
import {Accordion} from '../common/Accordion';
import {StaticMapView} from '../common/Map';
import {StyleSheet} from 'react-native';

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

type Props = {siteId?: string; coords?: Pick<Site, 'latitude' | 'longitude'>};

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

export const LocationDashboardScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
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

  const appBarRightButton = useMemo(
    () =>
      siteId ? (
        <AppBarIconButton
          name="settings"
          onPress={() => navigation.navigate('SITE_SETTINGS', {siteId})}
        />
      ) : (
        <AppBarIconButton
          name="add"
          onPress={() => navigation.navigate('CREATE_SITE', {coords})}
        />
      ),
    [siteId, coords, navigation],
  );

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          LeftButton={<ScreenCloseButton />}
          RightButton={appBarRightButton}
          title={site?.name ?? t('site.dashboard.default_title')}
        />
      }>
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
              value={t(`privacy.${project.privacy}.title`)}
            />
          )}
          {site && !project && (
            <RadioBlock
              label={
                <Text variant="body1" bold>
                  {t('site.dashboard.privacy')}
                </Text>
              }
              options={{
                PUBLIC: {text: t('privacy.PUBLIC.title')},
                PRIVATE: {text: t('privacy.PRIVATE.title')},
              }}
              groupProps={{
                name: 'site-privacy',
                onChange: onSitePrivacyChanged,
                value: site.privacy,
                ml: '',
              }}
            />
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
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({mapView: {height: 170}});
