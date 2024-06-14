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

import {User} from 'terraso-client-shared/account/accountSlice';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';

export type DeleteAccountPendingContentProps = {
  user: User;
};

export function DeleteAccountPendingContent({
  user,
}: DeleteAccountPendingContentProps) {
  const email = user.email;

  return (
    <>
      <TranslatedParagraph
        i18nKey="delete_account.pending.p0"
        values={{email}}
      />
      <TranslatedParagraph
        i18nKey="delete_account.pending.p1"
        values={{email}}
      />
      <TranslatedParagraph i18nKey="delete_account.pending.p2" />
    </>
  );
}
