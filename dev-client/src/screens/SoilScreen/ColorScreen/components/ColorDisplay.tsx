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

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  Box,
  Column,
  Text,
  View,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  munsellToRGB,
  munsellToString,
} from 'terraso-mobile-client/model/color/colorConversions';
import {MunsellColor} from 'terraso-mobile-client/model/color/types';

type Props = {
  color: MunsellColor;
  onDelete?: () => void;
  variant: keyof typeof variants;
};
export const ColorDisplay = ({onDelete, color, variant}: Props) => {
  const {t} = useTranslation();

  const rgb = munsellToRGB(color);
  const bgColor = rgb ? `rgb(${rgb.join(', ')})` : undefined;
  return (
    <Column alignItems="center">
      {variant !== 'sm' && (
        <>
          <Text variant="body1-strong">{munsellToString(color)}</Text>
          <Box height="sm" />
        </>
      )}
      <Box backgroundColor={bgColor} {...variants[variant]}>
        {onDelete && (
          <ConfirmModal
            title={t('soil.color.confirm_delete.title')}
            body={t('soil.color.confirm_delete.body')}
            actionLabel={t('soil.color.confirm_delete.action_name')}
            handleConfirm={onDelete}
            trigger={onPress => (
              <View position="absolute" top="-18px" right="-18px">
                <IconButton
                  name="delete"
                  type="md"
                  variant="normal-filled"
                  onPress={onPress}
                />
              </View>
            )}
          />
        )}
      </Box>
    </Column>
  );
};

const variants = {
  sm: {
    width: '20px',
    height: '20px',
    borderWidth: '1px',
  },
  md: {
    width: '100px',
    height: '100px',
    borderWidth: '2px',
  },
  lg: {
    width: '180px',
    height: '180px',
    borderWidth: '2px',
  },
} as const;
