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
import {useTranslation} from 'react-i18next';
import {PressableProps} from 'react-native';

import {Fab} from 'native-base';

import DeleteButton from 'terraso-mobile-client/components/buttons/special/DeleteButton';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {TextInput} from 'terraso-mobile-client/components/inputs/TextInput';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  Column,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SITE_NAME_MAX_LENGTH} from 'terraso-mobile-client/constants';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {
  deleteSite,
  updateSite,
} from 'terraso-mobile-client/model/site/siteGlobalReducer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  siteId: string;
};

type DeleteButtonWrapperProps = {
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

const DeleteButtonWrapper = ({disabled, onPress}: DeleteButtonWrapperProps) => {
  const {t} = useTranslation();

  return (
    <DeleteButton
      label={t('site.dashboard.delete_button')}
      disabled={disabled}
      onPress={onPress}
    />
  );
};

export const SiteSettingsScreen = ({siteId}: Props) => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const site = useSelector(state => state.site.sites[siteId]);
  const [name, setName] = useState(site?.name);
  const isOffline = useIsOffline();

  const onSave = useCallback(
    () => dispatch(updateSite({id: site.id, name})),
    [dispatch, site, name],
  );

  const onDelete = useCallback(async () => {
    await dispatch(deleteSite(site));
    navigation.navigate('BOTTOM_TABS');
  }, [dispatch, navigation, site]);

  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold
          BottomNavigation={null}
          AppBar={<AppBar title={name} />}>
          <Column px="16px" py="22px" space="20px" alignItems="flex-start">
            <Heading variant="h6">{t('site.dashboard.settings_title')}</Heading>

            <TextInput
              maxLength={SITE_NAME_MAX_LENGTH}
              disabled={isOffline}
              value={name}
              onChangeText={setName}
              label={t('site.create.name_label')}
              placeholder={t('site.create.name_label')}
            />
            {isOffline ? (
              <DeleteButtonWrapper disabled={true} />
            ) : (
              <ConfirmModal
                trigger={onOpen => <DeleteButtonWrapper onPress={onOpen} />}
                title={t('projects.sites.delete_site_modal.title')}
                body={t('projects.sites.delete_site_modal.body', {
                  siteName: site.name,
                })}
                actionName={t('projects.sites.delete_site_modal.action_name')}
                handleConfirm={onDelete}
              />
            )}
          </Column>
          <Fab
            label={t('general.save_fab')}
            onPress={onSave}
            isDisabled={isOffline}
          />
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
