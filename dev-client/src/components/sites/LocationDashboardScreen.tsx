import {ScreenDefinition, useNavigation} from '../../screens/AppScaffold';
import {useDispatch, useSelector} from '../../model/store';
import {HeaderTitle} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import RadioBlock, {IconLabel} from '../common/RadioBlock';
import {SitePrivacy, updateSite} from 'terraso-client-shared/site/siteSlice';
import {useCallback} from 'react';
import {Box, Text, useTheme} from 'native-base';
import {Icon, IconButton} from '../common/Icons';
import {ScreenScaffold} from '../../screens/ScreenScaffold';
import {MainMenuBar} from '../../screens/HeaderIcons';

type Props = {siteId: string};

const LocationDashboardView = ({siteId}: Props) => {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const dispatch = useDispatch();
  const site = useSelector(state => state.site.sites[siteId]);
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onSitePrivacyChanged = useCallback(
    (privacy: SitePrivacy) => dispatch(updateSite({...site, privacy})),
    [site, dispatch],
  );

  return (
    <ScreenScaffold padding="22">
      {!project && (
        <RadioBlock
          label={
            <IconLabel
              label={t('site.dashboard.privacy.site')}
              icon={<Icon name="info" />}
            />
          }
          options={{
            PUBLIC: {text: t('privacy.PUBLIC.title')},
            PRIVATE: {text: t('privacy.PRIVATE.title')},
          }}
          groupProps={{
            name: 'site-privacy',
            variant: 'oneLine',
            onChange: onSitePrivacyChanged,
            value: site.privacy,
          }}
        />
      )}
      {project && (
        <Box background={colors.grey[200]}>
          <Text>
            <Text bold>
              {t('site.dashboard.privacy.project', {
                privacy: t(`'site.dashboard.privacy.${site.privacy}.inline'`),
              })}
            </Text>
            <Text>{project.name}</Text>
          </Text>
        </Box>
      )}
    </ScreenScaffold>
  );
};

export const LocationDashboardScreen: ScreenDefinition<Props> = {
  View: LocationDashboardView,
  options: ({siteId}) => ({
    headerBackVisible: false,
    headerLeft: MainMenuBar,
    headerRight: ({tintColor}) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const {navigate} = useNavigation();
      return (
        <IconButton
          name="settings"
          _icon={{color: tintColor}}
          onPress={() => navigate('SITE_SETTINGS', {siteId})}
        />
      );
    },
    headerTitle: props => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const name = useSelector(state => state.site.sites[siteId].name);
      return <HeaderTitle {...props}>{name}</HeaderTitle>;
    },
  }),
};
