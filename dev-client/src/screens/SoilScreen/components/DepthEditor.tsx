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
import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {soilPitMethods} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {EditDepthOverlaySheet} from 'terraso-mobile-client/screens/SoilScreen/components/EditDepthOverlaySheet';
import {renderDepth} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';
import {AggregatedInterval} from 'terraso-mobile-client/store/depthIntervalHelpers';
import {useSiteSoilIntervals} from 'terraso-mobile-client/store/selectors';

export type DepthEditorProps = {
  siteId: string;
  aggregatedInterval: AggregatedInterval;
  requiredInputs: (typeof soilPitMethods)[number][];
};

export const DepthEditor = ({
  siteId,
  aggregatedInterval,
  requiredInputs,
}: DepthEditorProps) => {
  const {t} = useTranslation();

  const allDepths = useSiteSoilIntervals(siteId);
  const existingDepths = useMemo(
    () => allDepths.map(({interval: depthInterval}) => depthInterval),
    [allDepths],
  );

  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {renderDepth(t, aggregatedInterval.interval)}
      </Heading>
      <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
        <EditDepthOverlaySheet
          siteId={siteId}
          thisInterval={aggregatedInterval}
          existingDepths={existingDepths}
          requiredInputs={requiredInputs}
          trigger={onOpen => (
            <IconButton
              type="sm"
              variant="light"
              name="more-vert"
              onPress={onOpen}
            />
          )}
        />
      </RestrictBySiteRole>
    </Row>
  );
};
