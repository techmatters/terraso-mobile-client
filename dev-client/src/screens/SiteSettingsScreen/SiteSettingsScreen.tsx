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

import {DeleteButton} from 'terraso-mobile-client/components/buttons/common/DeleteButton';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  useNavToBottomTabsAndShowSyncError,
  usePopNavigationAndShowSyncError,
} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {TextField} from 'terraso-mobile-client/components/inputs/TextField';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  Column,
  View,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SITE_NAME_MAX_LENGTH} from 'terraso-mobile-client/constants';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useRoleCanEditSite} from 'terraso-mobile-client/hooks/permissionHooks';
import {
  deleteSite,
  updateSite,
} from 'terraso-mobile-client/model/site/siteGlobalReducer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
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
  const site = useSelector(state => state.site.sites[siteId]);
  const isOffline = useIsOffline();

  const [name, setName] = useState(site?.name);
  const dirty = name !== site?.name;

  const onSave = useCallback(() => {
    dispatch(updateSite({id: site.id, name}));
  }, [dispatch, site, name]);

  const onDelete = useCallback(async () => {
    await dispatch(deleteSite(site));
  }, [dispatch, site]);

  const userCanEditSite = useRoleCanEditSite(siteId);

  const handleMissingSite = useNavToBottomTabsAndShowSyncError('site');
  const handleInsufficientPermissions = usePopNavigationAndShowSyncError();

  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
    {data: userCanEditSite, doIfMissing: handleInsufficientPermissions},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold
          BottomNavigation={null}
          AppBar={<AppBar title={site?.name} />}>
          <Column px="16px" py="22px">
            <TextField
              maxLength={SITE_NAME_MAX_LENGTH}
              value={name}
              onChangeText={setName}
              label={t('site.create.name_label')}
              placeholder={t('site.create.name_label')}
              required
              showCounter
            />
            <View mt={4} alignItems="flex-end">
              <ContainedButton
                size="lg"
                label={t('general.save')}
                onPress={onSave}
                disabled={!dirty}
              />
            </View>
            <View mt={6}>
              {isOffline ? (
                <DeleteButtonWrapper disabled={true} />
              ) : (
                <ConfirmModal
                  trigger={onOpen => <DeleteButtonWrapper onPress={onOpen} />}
                  title={t('projects.sites.delete_site_modal.title')}
                  body={t('projects.sites.delete_site_modal.body', {
                    siteName: site?.name,
                  })}
                  actionLabel={t(
                    'projects.sites.delete_site_modal.action_name',
                  )}
                  handleConfirm={onDelete}
                />
              )}
            </View>
          </Column>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
