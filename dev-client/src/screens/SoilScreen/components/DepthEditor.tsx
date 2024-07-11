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
import {useTranslation} from 'react-i18next';

import {AggregatedInterval} from 'terraso-client-shared/selectors';
import {soilPitMethods} from 'terraso-client-shared/soilId/soilIdSlice';

import {
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {EditDepthModal} from 'terraso-mobile-client/screens/SoilScreen/components/EditDepthModal';
import {renderDepth} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';

export type DepthEditorProps = {
  siteId: string;
  aggregatedInterval: AggregatedInterval;
  requiredInputs: (typeof soilPitMethods)[number][];
};

export const DepthEditor = ({
  siteId,
  aggregatedInterval: {isFromPreset, interval},
  requiredInputs,
}: DepthEditorProps) => {
  const {t} = useTranslation();

  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {renderDepth(t, interval)}
      </Heading>
      <RestrictBySiteRole
        role={[
          {kind: 'project', role: 'MANAGER'},
          {kind: 'project', role: 'CONTRIBUTOR'},
          {kind: 'site', role: 'OWNER'},
        ]}>
        <EditDepthModal
          siteId={siteId}
          depthInterval={interval.depthInterval}
          requiredInputs={requiredInputs}
          mutable={!isFromPreset}
        />
      </RestrictBySiteRole>
    </Row>
  );
};
