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

import {Platform, Switch as RNSwitch} from 'react-native';

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
};

export type SwitchProps = SharedSwitchProps & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/* Our palette as a grid: [on | off] × [normal | faded]. */
const THUMB = {
  on: {
    normal: theme.colors.switch.thumbOn,
    faded: theme.colors.switch.thumbOnDisabled,
  },
  off: {
    normal: theme.colors.switch.thumbOff,
    faded: theme.colors.switch.thumbOffDisabled,
  },
};

const TRACK_ON = {
  normal: theme.colors.switch.trackOn,
  faded: theme.colors.switch.trackOnDisabled,
};

/* The color props React Native wants, which is why the shape is uneven: RN takes a single thumb color, so on/off is resolved here, but takes the track as a per-state map it resolves itself.
 *
 * Only Android needs the faded tone when disabled: it applies our colors as a color filter, which takes precedence over the drawable's own disabled tint, so anything we color would otherwise stay at full strength. iOS renders a disabled switch translucent itself and would fade these a second time. */
export const switchColorProps = (
  value: boolean,
  platform: typeof Platform.OS,
  disabled?: boolean,
) => {
  const tone = disabled && platform === 'android' ? 'faded' : 'normal';

  return {
    thumbColor: THUMB[value ? 'on' : 'off'][tone],
    trackColor: {
      /* Supplied even while the switch is off: the toggle animates natively before React re-renders, so resolving this by `value` would flash the default track color mid-animation. */
      true: TRACK_ON[tone],
      /* Left to the platform on purpose. iOS offers no way to fill the off track — `trackColor.false` maps to `tintColor`, the outline iOS 13+ stopped drawing — so the dark thumb supplies the contrast instead. */
      false: undefined,
    },
  };
};

export const Switch = ({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  testID,
}: SwitchProps) => (
  <RNSwitch
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    {...switchColorProps(value, Platform.OS, disabled)}
  />
);
