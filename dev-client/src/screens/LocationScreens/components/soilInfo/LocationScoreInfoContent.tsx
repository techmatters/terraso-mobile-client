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

import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {BodyText} from 'terraso-mobile-client/components/content/text/BodyText';

type LocationScoreInfoContentProps = {
  isSite: boolean;
};

export function LocationScoreInfoContent({
  isSite,
}: LocationScoreInfoContentProps) {
  return (
    <Column space={3}>
      {isSite && <BodyText i18nKey="site.soil_id.location_score_info.p1" />}
      <BodyText i18nKey="site.soil_id.location_score_info.p2" />
      <BodyText i18nKey="site.soil_id.location_score_info.p3" />
    </Column>
  );
}
