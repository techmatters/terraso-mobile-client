/*
 * Copyright © 2024 Technology Matters
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
import {Pressable} from 'react-native';

import {Row, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

type FormOverlaySheetHeaderProps = {
  onDone?: () => void;
};

/**
 * To be simplified internally with FormOverlaySheet component work (mobile-client ticket #1774).
 */
export const FormOverlaySheetHeader = ({
  onDone,
}: FormOverlaySheetHeaderProps) => {
  const {t} = useTranslation();

  return (
    <Pressable
      onPress={onDone}
      accessibilityRole="button"
      accessibilityLabel={t('general.done')}>
      <Row
        backgroundColor="primary.main"
        justifyContent="flex-end"
        alignItems="center"
        padding="md">
        <Text
          variant="body1-strong"
          color="primary.contrast"
          textTransform="uppercase">
          {t('general.done')}
        </Text>
      </Row>
    </Pressable>
  );
};
