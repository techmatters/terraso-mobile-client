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

import {Fab} from 'native-base';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {
  Box,
  Text,
  Column,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ColorAnalysisProps} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorAnalysisScreen';

export const ColorCropSoilScreen = (props: ColorAnalysisProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onComplete = useCallback(() => {
    const newProps = {...props, soil: 1};
    if (props.reference) {
      navigation.navigate('COLOR_ANALYSIS', newProps);
    } else {
      navigation.replace('COLOR_CROP_REFERENCE', newProps);
    }
  }, [navigation, props]);

  return (
    <ScreenScaffold AppBar={<AppBar title={t('soil.color.soil')} />}>
      <Column padding="md">
        <Box backgroundColor="grey.300" height="328px" />
        <Box height="md" />
        <Text variant="body1-strong">{t('soil.color.soil')}</Text>
        <Box height="sm" />
        <Text variant="body1">{t('soil.color.crop_soil')}</Text>
      </Column>
      <Fab
        onPress={onComplete}
        label={t('general.next')}
        leftIcon={<Icon name="check" />}
      />
    </ScreenScaffold>
  );
};
