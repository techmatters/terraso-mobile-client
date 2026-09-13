/*
 * Copyright © 2026 Technology Matters
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

import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {flushAllMatches} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import {useDispatch} from 'terraso-mobile-client/store';

export const ClearSoilIdCacheItem = () => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const [cleared, setCleared] = useState(false);

  const onPress = useCallback(() => {
    dispatch(flushAllMatches());
    setCleared(true);
    setTimeout(() => setCleared(false), 1500);
  }, [dispatch]);

  if (APP_CONFIG.environment === 'production') return null;

  return (
    <MenuItem
      variant="default"
      icon="delete-sweep"
      label={cleared ? t('general.cleared') : t('settings.clear_soil_id_cache')}
      onPress={onPress}
    />
  );
};
