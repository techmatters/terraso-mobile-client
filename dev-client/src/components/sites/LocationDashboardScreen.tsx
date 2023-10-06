import {
  useNavigation,
  ParamList,
  ScreenDefinitions,
} from '../../screens/AppScaffold';
import {useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {
  AppBar,
  AppBarIconButton,
  ScreenCloseButton,
  ScreenScaffold,
} from '../../screens/ScreenScaffold';
import {LocationDashboardView} from './LocationDashboardView';
import {Coords} from '../../model/map/mapSlice';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {SlopeScreen} from '../dataInputs/SlopeScreen';
import {SoilScreen} from '../dataInputs/SoilScreen';
import {useDefaultTabOptions} from '../../screens/TabBar';
import {SpeedDial} from '../common/SpeedDial';
import {Button} from 'native-base';
import {Icon} from '../common/Icons';

type Props = {siteId?: string; coords?: Coords};

const tabDefinitions = {
  SITE: LocationDashboardView,
  SLOPE: SlopeScreen,
  SOIL: SoilScreen,
} satisfies ScreenDefinitions;
type TabsParamList = ParamList<typeof tabDefinitions>;
type ScreenName = keyof TabsParamList;

const Tab = createMaterialTopTabNavigator<TabsParamList>();

const LocationDashboardTabs = (params: {siteId: string}) => {
  const {t} = useTranslation();
  const defaultOptions = useDefaultTabOptions();

  const tabs = useMemo(
    () =>
      Object.entries(tabDefinitions).map(([name, View]) => (
        <Tab.Screen
          name={name as ScreenName}
          key={name}
          initialParams={params}
          options={{...defaultOptions, tabBarLabel: t(`site.tabs.${name}`)}}
          children={props => <View {...((props.route.params ?? {}) as any)} />}
        />
      )),
    [params, t, defaultOptions],
  );

  return (
    <>
      <Tab.Navigator initialRouteName="SITE">{tabs}</Tab.Navigator>
      <SpeedDial>
        <Button variant="speedDial" leftIcon={<Icon name="description" />}>
          {t('site.dashboard.speed_dial.note_label')}
        </Button>
        <Button variant="speedDial" leftIcon={<Icon name="image" />}>
          {t('site.dashboard.speed_dial.photo_label')}
        </Button>
        <Button variant="speedDial" leftIcon={<Icon name="image" />}>
          {t('site.dashboard.speed_dial.bedrock_label')}
        </Button>
      </SpeedDial>
    </>
  );
};

export const LocationDashboardScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const site = useSelector(state =>
    siteId === undefined ? undefined : state.site.sites[siteId],
  );
  if (coords === undefined) {
    coords = site!;
  }

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
      {siteId ? (
        <LocationDashboardTabs siteId={siteId} />
      ) : (
        <LocationDashboardView siteId={siteId} coords={coords} />
      )}
    </ScreenScaffold>
  );
};
