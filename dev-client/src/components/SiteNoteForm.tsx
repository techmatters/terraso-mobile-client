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

import {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, TextInput} from 'react-native';

import {FormInput} from 'terraso-mobile-client/components/form/FormInput';

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

  const styles = StyleSheet.create({
    box: {
      backgroundColor: 'transparent',
    },
    content: {
      marginVertical: -20,
      marginHorizontal: -15,
    },
  });

  return (
    <FormInput
      ref={formInputRef}
      name="content"
      placeholder={t('site.notes.placeholder_text')}
      value={content}
      multiline={true}
      activeUnderlineColor="transparent"
      style={styles.box}
      contentStyle={styles.content}
    />
  );
};
