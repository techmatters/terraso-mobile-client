/*
 * Copyright © 2025 Technology Matters
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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking} from 'react-native';

import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {validateUrl} from 'terraso-mobile-client/util';

type Props = {
  labelI18nKey: string;
  urlI18nKey: string;
};

export const LinkItem = ({labelI18nKey, urlI18nKey}: Props) => {
  const {t} = useTranslation();
  const label = t(labelI18nKey);
  const url = t(urlI18nKey);

  const isValidUrl = useMemo(() => validateUrl(url), [url]);
  const openUrl = useCallback(() => {
    if (isValidUrl) {
      Linking.openURL(url);
    }
  }, [url, isValidUrl]);

  return (
    <MenuItem
      variant="default"
      icon="open-in-new"
      label={label}
      onPress={openUrl}
    />
  );
};
