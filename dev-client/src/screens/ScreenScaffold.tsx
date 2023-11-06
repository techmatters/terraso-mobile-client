import {Box, Row, Heading, Column} from 'native-base';
import {
  IconButton,
  IconButtonProps,
  MaterialCommunityIcons,
} from 'terraso-mobile-client/components/common/Icons';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar, View, LayoutChangeEvent} from 'react-native';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {signOut} from 'terraso-client-shared/account/accountSlice';

const HeaderHeightContext = createContext<number | undefined>(undefined);
export const useHeaderHeight = () => useContext(HeaderHeightContext);

const BottomNavIconButton = (props: IconButtonProps & {label: string}) => (
  <IconButton pb={0} _icon={{color: 'primary.contrast'}} {...props} />
);

export const AppBarIconButton = (props: IconButtonProps) => (
  <IconButton size="md" _icon={{color: 'primary.contrast'}} {...props} />
);

export const ScreenBackButton = ({icon = 'arrow-back'}: {icon?: string}) => {
  const navigation = useNavigation();
  const goBack = useCallback(() => navigation.pop(), [navigation]);
  return <AppBarIconButton name={icon} onPress={goBack} />;
};

export const ScreenCloseButton = () => <ScreenBackButton icon="close" />;

type AppBarProps = {
  LeftButton?: React.ReactNode;
  RightButton?: React.ReactNode;
  title?: string;
};

export const AppBar = ({
  LeftButton = <ScreenBackButton />,
  RightButton,
  title,
}: AppBarProps) => {
  const {t} = useTranslation();
  const route = useRoute();
  const safeAreaTopInset = useSafeAreaInsets().top;

  return (
    <Row
      px="8px"
      py="4px"
      pt={`${safeAreaTopInset}px`}
      minHeight="56px"
      bg="primary.main">
      <Row flex={1} space="24px" alignItems="center">
        {LeftButton}
        <Heading variant="h6" color="primary.contrast">
          {title ?? t(`screens.${route.name}`)}
        </Heading>
      </Row>
      {RightButton}
    </Row>
  );
};

export const BottomNavigation = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const loggedIn = useSelector(
    state => state.account.currentUser.data !== null,
  );

  const onHome = useCallback(() => navigation.navigate('HOME'), [navigation]);

  const onProject = useCallback(
    () => navigation.navigate('PROJECT_LIST'),
    [navigation],
  );

  const onLogout = useCallback(() => {
    dispatch(signOut());
  }, [dispatch]);

  useEffect(() => {
    if (!loggedIn) {
      navigation.navigate('LOGIN');
    }
  }, [loggedIn, navigation]);

  return (
    <Row bg="primary.main" justifyContent="center" space={10} pb={2}>
      <BottomNavIconButton
        name="location-pin"
        label={t('bottom_navigation.home')}
        onPress={onHome}
      />
      <BottomNavIconButton
        as={MaterialCommunityIcons}
        name="briefcase"
        label={t('bottom_navigation.projects')}
        onPress={onProject}
      />
      <BottomNavIconButton
        name="settings"
        label={t('bottom_navigation.settings')}
      />
      <ConfirmModal
        trigger={onOpen => (
          <BottomNavIconButton
            name="logout"
            label={t('bottom_navigation.sign_out')}
            onPress={onOpen}
          />
        )}
        title="Sign out"
        body="Sign out of Terraso?"
        actionName="Sign out"
        handleConfirm={onLogout}
      />
    </Row>
  );
};

type Props = {
  children: React.ReactNode;
  AppBar?: React.ReactNode;
  BottomNavigation?: React.ReactNode;
};
export const ScreenScaffold = ({
  children,
  AppBar: PropsAppBar = <AppBar />,
  BottomNavigation: PropsBottomNavigation = <BottomNavigation />,
}: Props) => {
  const [headerHeight, setHeaderHeight] = useState<number | undefined>(
    undefined,
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height),
    [setHeaderHeight],
  );

  return (
    <>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor={'#00000000'}
      />
      <Column flex={1}>
        <View onLayout={onLayout}>{PropsAppBar}</View>
        <HeaderHeightContext.Provider value={headerHeight ?? 0}>
          <Box flex={1}>{children}</Box>
        </HeaderHeightContext.Provider>
        {PropsBottomNavigation}
      </Column>
    </>
  );
};
