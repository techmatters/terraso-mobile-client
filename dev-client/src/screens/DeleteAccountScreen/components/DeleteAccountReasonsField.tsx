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
import {useTranslation} from 'react-i18next';

import {CheckboxList} from 'terraso-mobile-client/components/inputs/CheckboxList';
import {
  DELETE_ACCOUNT_REASONS,
  DeleteAccountReason,
} from 'terraso-mobile-client/screens/DeleteAccountScreen/deleteAccountFeedback';

export type DeleteAccountReasonsFieldProps = {
  value: DeleteAccountReason[];
  onValueChange: (value: DeleteAccountReason[]) => void;
};

const reasonKey = (reason: DeleteAccountReason) => reason;

export function DeleteAccountReasonsField({
  value,
  onValueChange,
}: DeleteAccountReasonsFieldProps) {
  const {t} = useTranslation();
  const renderReason = useCallback(
    (reason: DeleteAccountReason) =>
      t(`delete_account.feedback.reasons.${reason}`),
    [t],
  );

  return (
    <CheckboxList
      label={t('delete_account.feedback.reasons_label')}
      options={DELETE_ACCOUNT_REASONS}
      optionKey={reasonKey}
      renderValue={renderReason}
      value={value}
      onValueChange={onValueChange}
    />
  );
}
