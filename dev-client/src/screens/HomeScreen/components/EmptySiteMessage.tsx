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
import {Trans, useTranslation} from 'react-i18next';
import {LinkNewWindowIcon} from 'terraso-mobile-client/components/icons/LinkNewWindowIcon';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const EmptySiteMessage = () => {
  const {t} = useTranslation();

  return (
    <Text px="17px" variant="body1">
      <Trans
        i18nKey="site.empty.info"
        components={{
          // TODO-cknipe: Update / delete this too
          icon: (
            <LinkNewWindowIcon
              label={t('site.empty.link_label')}
              url={t('site.empty.link_url')}
            />
          ),
        }}
      />
    </Text>
  );
};
