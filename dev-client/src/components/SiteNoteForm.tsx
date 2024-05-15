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

import {useTranslation} from 'react-i18next';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {TextInput} from 'react-native';
import {useRef, useEffect} from 'react';

type Props = {
  content: string;
};

export const SiteNoteForm = ({content}: Props) => {
  const {t} = useTranslation();
  const formInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (formInputRef.current) {
      formInputRef.current.focus();
    }
  }, []);

  return (
    <FormInput
      pt={2}
      pb={4}
      ref={formInputRef}
      padding={0}
      borderWidth={0}
      backgroundColor="transparent"
      name="content"
      placeholder={t('site.notes.placeholder_text')}
      value={content}
      multiline
      maxHeight={200}
      overflow="scroll"
      textAlignVertical="top"
    />
  );
};
