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

import {useCallback, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Platform, StyleSheet} from 'react-native';

import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';

import {Button} from 'native-base';

import {setHasAccessTokenAsync} from 'terraso-client-shared/account/accountSlice';
import GoogleLogo from 'terraso-client-shared/assets/google.svg';
import MicrosoftLogo from 'terraso-client-shared/assets/microsoft.svg';

import LandPKSLogo from 'terraso-mobile-client/assets/landpks-logo.svg';
import TerrasoLogo from 'terraso-mobile-client/assets/terraso-logo.svg';
import {auth, AuthProvider} from 'terraso-mobile-client/auth';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

const showAppleAuth = Platform.OS === 'ios';

export const LoginScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const loggedIn = useSelector(
    state => state.account.currentUser.data !== null,
  );

  // note: we intentionally run this on every render,
  // so we can't accidentally get stuck on this view because
  // it was navigated to while there is already user data

  const dispatch = useDispatch();
  const onPress = useCallback(
    (providerName: AuthProvider) => {
      return () => {
        auth(providerName)
          .then(() => {
            dispatch(setHasAccessTokenAsync());
          })
          .catch(e => console.error(e));
      };
    },
    [dispatch],
  );

  useEffect(() => {
    if (loggedIn) {
      navigation.replace('BOTTOM_TABS');
    }
  }, [loggedIn, navigation]);

  return (
    <Column bgColor="primary.main" alignItems="center" h="100%">
      <Column marginTop={135} alignItems="center">
        <LandPKSLogo width="144px" height="144px" />
        <Heading
          variant="h3"
          fontWeight="bold"
          fontSize="30px"
          marginTop="34px"
          color="primary.contrast">
          {t('login.title')}
        </Heading>
        <Heading
          variant="h5"
          color="primary.contrast"
          fontSize="22px"
          marginTop="14px">
          {t('login.subtitle')}
        </Heading>
        <Box h="72px" />
        <Button.Group direction="column" space={5}>
          <Button
            style={styles.loginButton}
            _text={styles.loginButtonText}
            size="lg"
            onPress={onPress('google')}
            startIcon={<GoogleLogo />}>
            {t('account.google_login')}
          </Button>
          <Button
            style={styles.loginButton}
            _text={styles.loginButtonText}
            size="lg"
            onPress={onPress('microsoft')}
            startIcon={<MicrosoftLogo />}>
            {t('account.microsoft_login')}
          </Button>
          {showAppleAuth ? (
            <AppleAuthenticationButton
              buttonType={AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthenticationButtonStyle.WHITE}
              style={styles.appleloginButton}
              onPress={onPress('apple')}
            />
          ) : (
            <></>
          )}
        </Button.Group>
      </Column>
      <Box flexGrow={3} />
      <Column pb="60px" alignItems="center" justifyContent="flex-end">
        <Row alignItems="flex-end">
          <Text variant="body1" color="primary.contrast" mr="5px" mb="6px">
            {t('login.from')}
          </Text>
          <TerrasoLogo width="122px" height="39px" />
        </Row>
      </Column>
    </Column>
  );
};

const styles = StyleSheet.create({
  loginButton: {
    backgroundColor: 'white',
    justifyContent: showAppleAuth ? 'center' : 'flex-start',
  },
  loginButtonText: {
    color: showAppleAuth ? 'text.primary' : 'primary.main',
    textTransform: showAppleAuth ? 'none' : 'uppercase',
  },
  appleloginButton: {
    width: 275,
    height: 44,
  },
});
