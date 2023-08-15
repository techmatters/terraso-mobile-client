import {Box, Button, Column, Heading, Text} from 'native-base';
import {ScreenDefinition, useNavigation} from './AppScaffold';
import {useDispatch, useSelector} from '../model/store';
import {useEffect, useCallback} from 'react';
import {auth} from '../auth';
import {setHasAccessTokenAsync} from 'terraso-client-shared/account/accountSlice';
import {useTranslation} from 'react-i18next';
import {Image} from 'react-native';

const LoginView = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const loggedIn = useSelector(
    state => state.account.currentUser.data !== null,
  );

  // note: we intentionally run this on every render,
  // so we can't accidentally get stuck on this view because
  // it was navigated to while there is already user data

  const dispatch = useDispatch();
  const onPress = useCallback(() => {
    auth()
      .then(() => dispatch(setHasAccessTokenAsync()))
      .catch(e => console.error(e));
  }, [dispatch]);

  useEffect(() => {
    if (loggedIn) {
      navigation.replace('HOME');
    }
  });

  return (
    <Column bgColor="primary.main" alignItems="center" height="100%">
      <Column height="50%" justifyContent="flex-end" alignItems="center">
        <Heading variant="h3" fontSize="40px" color="primary.contrast">
          {t('login.title')}
        </Heading>
        <Box height="28px" />
        <Heading variant="h5" color="primary.contrast" textAlign="center">
          {t('login.subtitle')}
        </Heading>
        <Box height="72px" />
        <Button
          bgColor="primary.contrast"
          _text={{color: 'primary.main'}}
          size="lg"
          onPress={onPress}>
          {t('login.google_button')}
        </Button>
      </Column>
      <Column
        flexGrow={1}
        paddingBottom="60px"
        alignItems="center"
        justifyContent="flex-end">
        <Image source={require('../../assets/terraso-logo.png')} />
        <Box height="12px" />
        <Text variant="caption" color="primary.contrast">
          {t('login.description')}
        </Text>
      </Column>
    </Column>
  );
};

export const LoginScreen: ScreenDefinition = {
  View: LoginView,
  options: () => ({
    headerShown: false,
  }),
};
