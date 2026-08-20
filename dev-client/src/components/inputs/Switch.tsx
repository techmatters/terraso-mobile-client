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

import {Switch as RNSwitch, StyleProp, ViewStyle} from 'react-native';

import {theme} from 'terraso-mobile-client/theme';

/* Switch — use this for standalone controlled toggles.
 *
 * Knows nothing about Formik. Caller passes value/onValueChange directly.
 * For Formik-driven forms, use FormSwitch (which wraps Switch).
 *
 * Colors are owned here and deliberately not exposed as props, so every switch
 * in the app reads the same. Callers render their own label text alongside. */

/* Display props shared with FormSwitch. New display props belong here so both
 * components inherit them; new controlled-state props go in SwitchProps. */
export type SharedSwitchProps = {
  /* Required: React Native does not associate neighboring label text with the
   * switch, so without this a screen reader announces only "switch, on". */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export type SwitchProps = SharedSwitchProps & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export const Switch = ({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  testID,
  style,
}: SwitchProps) => (
  <RNSwitch
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    style={style}
    thumbColor={value ? theme.colors.primary.main : theme.colors.grey[700]}
    /* The platform's default off-state grey is nearly invisible on our white
     * background, so we set it. Disabled switches keep that platform grey —
     * being hard to see is the point when the control can't be used. */
    trackColor={{
      true: disabled ? undefined : theme.colors.primary.lighter,
      // false: disabled ? undefined : theme.colors.grey[300],
    }}
    /* The only prop that tints the off track on iOS: trackColor.false maps to
     * `tintColor`, which iOS 13+ ignores for the track fill. */
    // ios_backgroundColor={theme.colors.gray[400]}
  />
);
