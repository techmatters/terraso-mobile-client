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

/* Stable keys (not translated labels) so analytics group the same way in every language. Also used as the i18n key suffix under delete_account.feedback.reasons. */
export const DELETE_ACCOUNT_REASONS = [
  'no_longer_needed',
  'switched_app',
  'missing_features',
  'difficult_to_use',
  'errors_or_bugs',
  'privacy_concerns',
  'poor_support',
  'other',
] as const;

export type DeleteAccountReason = (typeof DELETE_ACCOUNT_REASONS)[number];

export type DeleteAccountFeedback = {
  reasons: DeleteAccountReason[];
  details: string;
};
