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

import {useTranslation} from 'react-i18next';
import {Image, Pressable, StyleSheet} from 'react-native';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type Rgb255 = [number, number, number];

export const cssRgb = (rgb: Rgb255 | undefined): string | undefined =>
  rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : undefined;

// One side of the grid. `measuredRgb` is the colour measured for the region
// (display sRGB); `finalCss` is the bottom swatch — the reference card's
// expected colour for the reference column, the corrected Munsell chip for the
// soil column.
export type PipelineColumn = {
  heading: string;
  cropBase64?: string;
  measuredRgb?: Rgb255;
  finalCss?: string;
  finalLabel: string;
};

const SWATCH_SIZE = 140;

// Small "edit" affordance shown in the corner of a tappable cell.
const EditBadge = () => (
  <Box
    position="absolute"
    top="4px"
    right="4px"
    bg="rgba(0,0,0,0.55)"
    borderRadius="full"
    p="3px">
    <Icon name="edit" size={14} color="white" />
  </Box>
);

type SwatchProps = {
  color: string | undefined;
  label: string;
  onPress?: () => void;
};
const Swatch = ({color, label, onPress}: SwatchProps) => {
  const swatch = (
    <Column alignItems="center">
      <Box position="relative">
        <Box
          width={`${SWATCH_SIZE}px`}
          height={`${SWATCH_SIZE}px`}
          borderWidth={onPress ? '2px' : '1px'}
          borderColor={onPress ? 'primary.main' : 'grey.500'}
          borderRadius="md"
          bg={color ?? 'grey.200'}
        />
        {onPress && <EditBadge />}
      </Box>
      <Box height="xs" />
      <Text variant="body2">{label}</Text>
    </Column>
  );
  return onPress ? <Pressable onPress={onPress}>{swatch}</Pressable> : swatch;
};

// Pipeline-stage arrow label that sits between rows (e.g. "↓ sample color"
// under the photo, "↓ correction" under the measured swatch).
const PipelineArrow = ({label}: {label: string}) => (
  <Text variant="body1" italic>{`↓ ${label}`}</Text>
);

const ColumnView = ({
  column,
  onSelectColor,
  onSelectPhoto,
}: {
  column: PipelineColumn;
  onSelectColor?: () => void;
  // When provided, tapping the cropped-region image re-opens the crop for it.
  onSelectPhoto?: () => void;
}) => {
  const {t} = useTranslation();
  const photo = column.cropBase64 ? (
    <Image
      source={{uri: `data:image/jpeg;base64,${column.cropBase64}`}}
      style={styles.cropImage}
    />
  ) : (
    <Box style={styles.cropImage} bg="grey.300" />
  );
  return (
    <Column alignItems="center" space="xs">
      <Heading variant="h6" bold>
        {column.heading}
      </Heading>
      {onSelectPhoto ? (
        <Pressable onPress={onSelectPhoto}>
          <Box position="relative">
            {photo}
            <EditBadge />
          </Box>
        </Pressable>
      ) : (
        photo
      )}
      <Text variant="body2">{t('colorCamera.info.photo')}</Text>
      <PipelineArrow label={t('colorCamera.info.avgStep')} />
      <Swatch
        color={cssRgb(column.measuredRgb)}
        label={t('colorCamera.info.measuredRgb')}
        onPress={onSelectColor}
      />
      <PipelineArrow label={t('colorCamera.info.correctionStep')} />
      <Swatch color={column.finalCss} label={column.finalLabel} />
    </Column>
  );
};

type Props = {
  reference: PipelineColumn;
  soil: PipelineColumn;
  // When provided, the measured swatch in each column becomes tappable (opens
  // the dominant-colour editor for that ROI).
  onSelectColor?: (which: 'reference' | 'soil') => void;
  // When provided, tapping a column's cropped-region image re-opens the crop.
  onSelectPhoto?: (which: 'reference' | 'soil') => void;
  // When provided, a ⇄ control between the columns swaps reference and soil.
  onSwap?: () => void;
};

/**
 * The reference/soil pipeline visualisation: two columns × three rows (cropped
 * photo → measured colour → final swatch). Shared by the color-analysis info
 * screen (read-only) and the combined prototype screen (tappable measured
 * swatches + swap).
 */
export const ColorPipelineGrid = ({
  reference,
  soil,
  onSelectColor,
  onSelectPhoto,
  onSwap,
}: Props) => (
  <Row justifyContent="space-around" alignItems="flex-start">
    <ColumnView
      column={reference}
      onSelectColor={onSelectColor && (() => onSelectColor('reference'))}
      onSelectPhoto={onSelectPhoto && (() => onSelectPhoto('reference'))}
    />
    {onSwap && (
      <Pressable onPress={onSwap} style={styles.swap}>
        <Icon name="swap-horiz" />
      </Pressable>
    )}
    <ColumnView
      column={soil}
      onSelectColor={onSelectColor && (() => onSelectColor('soil'))}
      onSelectPhoto={onSelectPhoto && (() => onSelectPhoto('soil'))}
    />
  </Row>
);

const styles = StyleSheet.create({
  cropImage: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
  },
  swap: {
    // Sit between the two columns at the level of the top (photo) row, not
    // centred over the whole three-row stack.
    alignSelf: 'flex-start',
    marginTop: 80,
    padding: 8,
  },
});
