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

import {useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {SelectMenuList} from 'terraso-mobile-client/components/inputs/Select';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {FormOverlaySheet} from 'terraso-mobile-client/components/sheets/FormOverlaySheet';
import {
  languageDisplayString,
  LanguageOption,
  setLanguage,
  SUPPORTED_LANGUAGES,
} from 'terraso-mobile-client/localization';

export function SelectLanguageItem() {
  const {t, i18n} = useTranslation();
  const ref = useRef<ModalHandle>(null);
  const activeLanguage = i18n.language as LanguageOption;

  const onLanguageChange = async (lang: LanguageOption) => {
    await i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const renderLanguageOption = useCallback((option: LanguageOption) => {
    return languageDisplayString(option);
  }, []);

  return (
    <FormOverlaySheet
      ref={ref}
      trigger={onOpen => (
        <MenuItem
          icon="language"
          label={t('settings.select_language', {
            language: languageDisplayString(activeLanguage),
          })}
          onPress={onOpen}
        />
      )}>
      <SelectMenuList
        nullable={false}
        options={SUPPORTED_LANGUAGES}
        optionKey={option => option}
        value={activeLanguage}
        onValueChange={onLanguageChange}
        renderValue={renderLanguageOption}
        modalRef={ref}
      />
    </FormOverlaySheet>
  );
}
