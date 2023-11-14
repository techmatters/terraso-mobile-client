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

import {useCallback, useState} from 'react';
import {
  Fab,
  Input,
  Button,
  // useTheme,
  FormControl,
  Select,
  Column,
  // Row,
  // Text,
  // Spacer,
  // Pressable,
} from 'native-base';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import {useTranslation} from 'react-i18next';
import {IconLabel} from 'terraso-mobile-client/components/common/RadioBlock';
import {deleteSite, updateSite} from 'terraso-client-shared/site/siteSlice';
import {
  ScreenScaffold,
  AppBar,
} from 'terraso-mobile-client/screens/ScreenScaffold';

type Props = {
  siteId: string;
};

export const SiteSettingsScreen = ({siteId}: Props) => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  // const {colors} = useTheme();
  const {navigate} = useNavigation();
  const site = useSelector(state => state.site.sites[siteId]);
  const [name, setName] = useState(site.name);

  // const onTeamPress = useCallback(
  //   () => navigate('SITE_TEAM_SETTINGS', {siteId}),
  //   [siteId, navigate],
  // );

  const onSave = useCallback(
    () => dispatch(updateSite({id: site.id, name})),
    [dispatch, site, name],
  );

  const onDelete = useCallback(async () => {
    // TODO: confirm successful deletion before navigating home
    navigate('HOME');
    await dispatch(deleteSite(site));
  }, [dispatch, navigate, site]);

  return (
    <ScreenScaffold
      BottomNavigation={null}
      AppBar={<AppBar title={site.name} />}>
      <Column px="16px" py="22px" space="20px" alignItems="flex-start">
        <Input
          value={name}
          onChangeText={setName}
        />
        {/*
          TODO: Uncomment button after feature is written.
        <Pressable
          variant="subtle"
          w="full"
          background={colors.grey[200]}
          py="12px"
          pl="16px"
          pr="32px"
          onPress={onTeamPress}>
          <Row
            size="container"
            alignItems="center"
            justifyContent="space-around">
            <Icon name="people" />
            <Spacer flexGrow={0} w="16px" />
            <Text>{t('site.dashboard.team_button')}</Text>
            <Spacer />
            <Icon name="arrow-forward-ios" />
          </Row>
        </Pressable>
          */}
        <FormControl>
          <FormControl.Label>
            <IconLabel
              label={t('site.dashboard.transfer_label')}
              icon={<Icon name="info" />}
            />
          </FormControl.Label>
          <Select dropdownIcon={<Icon name="arrow-drop-down" />} />
        </FormControl>
        <Button
          pl={0}
          variant="link"
          startIcon={<Icon name="content-copy" />}
          endIcon={<Icon name="info" />}>
          {t('site.dashboard.copy_download_link_button').toUpperCase()}
        </Button>
        {/*
          TODO: Uncomment button after archiving code is done.
        <FormControl alignItems="flex-start">
          <Button
            pl={0}
            variant="link"
            startIcon={<Icon name="archive" />}
            endIcon={<Icon name="info" />}>
            {t('site.dashboard.archive_button').toUpperCase()}
          </Button>
          <FormControl.HelperText ml="26px" mt={0}>
            {t('site.dashboard.archive_button_help_text')}
          </FormControl.HelperText>
        </FormControl>
        */}
        <Button
          pl={0}
          variant="link"
          _text={{color: 'error.main'}}
          startIcon={<Icon color="error.main" name="delete-forever" />}
          onPress={onDelete}>
          {t('site.dashboard.delete_button').toUpperCase()}
        </Button>
      </Column>
      <Fab label={t('general.save_fab')} onPress={onSave} />
    </ScreenScaffold>
  );
};
