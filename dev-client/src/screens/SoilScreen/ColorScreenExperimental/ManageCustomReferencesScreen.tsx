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

import {useCallback} from 'react';
import {Alert} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  Box,
  Column,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {linearToSrgb} from 'terraso-mobile-client/model/color/colorDetection';
import {
  CustomReference,
  deleteCustomReference,
  useCustomReferences,
} from 'terraso-mobile-client/model/color/customReferences';
import {LinearRgb} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Phase-6 dev-only screen: shows every custom-calibrated reference
// currently in the MMKV store, with a color swatch, illuminant note
// and a Delete button. Predefined references (LINEAR_REFERENCES) are
// not shown — those are source-code constants and can't be deleted.
export const ManageCustomReferencesScreen = () => {
  const refs = useCustomReferences();

  return (
    <ScreenScaffold AppBar={<AppBar title="Custom references (dev)" />}>
      <SafeScrollView>
        <Column padding="md" space="md">
          {refs.length === 0 ? (
            <Paragraph>
              No custom references saved yet. Use "Calibrate reference card" in
              Settings to create one.
            </Paragraph>
          ) : (
            refs.map(r => <CustomReferenceRow key={r.id} reference={r} />)
          )}
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
};

const CustomReferenceRow = ({reference}: {reference: CustomReference}) => {
  const onDelete = useCallback(() => {
    Alert.alert(
      'Delete reference?',
      `"${reference.name}" will be removed from your custom references library. This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCustomReference(reference.id),
        },
      ],
    );
  }, [reference.id, reference.name]);

  const {r, g, b} = reference.linearRgb;
  const rgbLabel = `linear-sRGB: r=${r.toFixed(4)} g=${g.toFixed(4)} b=${b.toFixed(4)}`;
  const createdLabel = new Date(reference.createdAt).toLocaleString();

  return (
    <Box
      padding="md"
      borderRadius="4px"
      borderWidth="1px"
      borderColor="grey.400"
      backgroundColor="grey.100">
      <Row space="md" alignItems="center">
        <ColorSwatch linearRgb={reference.linearRgb} />
        <Column flex={1} space="sm">
          <Text variant="body1-strong">{reference.name}</Text>
          <Text variant="caption">{rgbLabel}</Text>
          {reference.calibratedUnder && (
            <Text variant="caption">
              Illuminant: {reference.calibratedUnder}
            </Text>
          )}
          <Text variant="caption">Saved: {createdLabel}</Text>
        </Column>
      </Row>
      <Box height="sm" />
      <ContainedButton label="Delete" onPress={onDelete} stretchToFit={true} />
    </Box>
  );
};

// Small colored square previewing what the calibrated reference looks
// like on a display. Convert linear-sRGB → gamma-encoded sRGB (0-255)
// so the browser/native renderer shows the correct display color.
const ColorSwatch = ({linearRgb}: {linearRgb: LinearRgb}) => {
  const toByte = (v: number) => Math.round(linearToSrgb(v));
  const css = `rgb(${toByte(linearRgb.r)}, ${toByte(linearRgb.g)}, ${toByte(linearRgb.b)})`;
  return (
    <Box
      width="48px"
      height="48px"
      borderRadius="4px"
      borderWidth="1px"
      borderColor="grey.500"
      backgroundColor={css}
    />
  );
};
