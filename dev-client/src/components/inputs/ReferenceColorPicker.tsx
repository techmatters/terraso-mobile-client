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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  listAvailableReferences,
  ReferenceColor,
} from 'terraso-mobile-client/model/rawColor/referenceColors';
import {useSelectedReference} from 'terraso-mobile-client/model/rawColor/referenceColorSelection';

// Sticky reference-color dropdown, used on the Picture-Taking screens to let
// the user pick which physical card their capture's reference ROI is
// showing. Consumes listAvailableReferences() so a future custom-refs feature
// slots in without touching this component. Selection persists via
// useSelectedReference (MMKV) — the dropdown remembers the last choice
// across captures and app restarts.

export type ReferenceColorPickerProps = {
  /** Shown above the dropdown. Defaults to the i18n label. */
  label?: string;
  /** Called after the selection changes. The selected reference is also
   *  reflected in `useSelectedReference()` for any other subscriber. */
  onChange?: (reference: ReferenceColor) => void;
  disabled?: boolean;
};

export const ReferenceColorPicker = ({
  label,
  onChange,
  disabled,
}: ReferenceColorPickerProps) => {
  const {t} = useTranslation();
  const options = useMemo(() => [...listAvailableReferences()], []);
  const {reference, setReferenceId} = useSelectedReference();

  const onValueChange = useCallback(
    (id: string) => {
      setReferenceId(id);
      const next = options.find(r => r.id === id);
      if (next && onChange) {
        onChange(next);
      }
    },
    [options, onChange, setReferenceId],
  );

  // Format each option as "<label>" or "<label> (Not Recommended)". Keep the
  // affordance inline rather than as a separate column — the dropdown's
  // Select component has no secondary-text slot.
  const renderValue = useCallback(
    (id: string) => {
      const ref = options.find(r => r.id === id);
      if (!ref) {
        return id;
      }
      const suffix = ref.notRecommended
        ? ` (${t('colorCamera.referencePicker.notRecommended')})`
        : '';
      return `${ref.label}${suffix}`;
    },
    [options, t],
  );

  const resolvedLabel = label ?? t('colorCamera.referencePicker.label');

  return (
    <Select<string, false>
      nullable={false}
      label={resolvedLabel}
      options={options.map(r => r.id)}
      value={reference?.id ?? options[0]?.id ?? ''}
      onValueChange={onValueChange}
      renderValue={renderValue}
      disabled={disabled}
    />
  );
};
