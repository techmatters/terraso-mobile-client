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

import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {DataPrivacyContent} from 'terraso-mobile-client/components/content/info/privacy/DataPrivacyContent';
import {DataPrivacyHeading} from 'terraso-mobile-client/components/content/info/privacy/DataPrivacyHeading';

export const DataPrivacyInfoButton = () => {
  return (
    <InfoButton sheetHeading={<DataPrivacyHeading />}>
      <DataPrivacyContent />
    </InfoButton>
  );
};
