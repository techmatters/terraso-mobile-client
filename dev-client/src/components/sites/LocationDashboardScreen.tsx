import {ScreenDefinition, useNavigation} from '../../screens/AppScaffold';
import {useDispatch, useSelector} from '../../model/store';
import {HeaderTitle} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import RadioBlock from '../common/RadioBlock';
import {
  Site,
  SitePrivacy,
  updateSite,
} from 'terraso-client-shared/site/siteSlice';
import {useCallback} from 'react';
import {Box, Divider, Text, Column} from 'native-base';
import {IconButton} from '../common/Icons';
import {ScreenScaffold} from '../../screens/ScreenScaffold';
import {Accordion} from '../common/Accordion';
import CloseButton from '../common/CloseButton';
import {StaticMapView} from '../common/Map';
import {StyleSheet} from 'react-native';

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
      <Box height="5px" />
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

const LocationDashboardView = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
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
    <ScreenScaffold>
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
          <LocationDetail label={t('geo.elevation.title')} value={'1900 ft'} />
          {site && (
            <>
              <LocationDetail
                label={t('site.dashboard.location_accuracy')}
                value={'20 ft'}
              />
              <LocationDetail label={t('soil.bedrock')} value={'not found'} />
              <LocationDetail
                label={t('site.dashboard.last_modified.label')}
                value={t('site.dashboard.last_modified.value', {
                  date: '8/15/23',
                  name: 'Sam Sam',
                })}
              />
            </>
          )}
        </Box>
      </Accordion>
      <Divider />
      <Column space="20px" padding="16px">
        <LocationPrediction
          prediction="Clifton"
          confidence="90%"
          label={t('soil.soil_id').toUpperCase()}
        />
        <LocationPrediction
          prediction="Loamy Upland"
          confidence="80%"
          label={t('soil.ecological_site_id').toUpperCase()}
        />
        <LocationPrediction
          prediction="Class 1"
          confidence="85%"
          label={t('soil.land_capability_classification').toUpperCase()}
        />
      </Column>
    </ScreenScaffold>
  );
};

export const LocationDashboardScreen: ScreenDefinition<Props> = {
  View: LocationDashboardView,
  options: ({siteId, coords}) => ({
    headerBackVisible: false,
    headerLeft: CloseButton,
    headerRight: ({tintColor}) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const {navigate} = useNavigation();
      return siteId ? (
        <IconButton
          name="settings"
          _icon={{color: tintColor}}
          onPress={() => navigate('SITE_SETTINGS', {siteId})}
        />
      ) : (
        <IconButton
          name="add"
          _icon={{color: tintColor}}
          onPress={() => navigate('CREATE_SITE', {coords})}
        />
      );
    },
    headerTitle: props => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const {t} = useTranslation();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const name = useSelector(state =>
        siteId === undefined
          ? t('site.dashboard.default_title')
          : state.site.sites[siteId].name,
      );
      return <HeaderTitle {...props}>{name}</HeaderTitle>;
    },
  }),
};

const styles = StyleSheet.create({mapView: {height: 170}});
