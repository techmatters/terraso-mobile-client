# Copyright © 2024 Technology Matters
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published
# by the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see https://www.gnu.org/licenses/.

import {Column, Heading, Row} from 'native-base';
import {
  DepthDependentSoilData,
  soilPitMethods,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {EditIntervalModalContent} from 'terraso-mobile-client/screens/SoilScreen/components/EditIntervalModalContent';
import {BottomSheetModal} from 'terraso-mobile-client/components/BottomSheetModal';
import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {useTranslation} from 'react-i18next';
import {AggregatedInterval} from 'terraso-client-shared/selectors';

const DepthIntervalEditor = ({
  siteId,
  aggregatedInterval: {mutable, interval},
  requiredInputs,
}: {
  siteId: string;
  aggregatedInterval: AggregatedInterval;
  requiredInputs: (typeof soilPitMethods)[number][];
}) => {
  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {interval.label && `${interval.label}: `}
        {`${interval.depthInterval.start}-${interval.depthInterval.end} cm`}
      </Heading>
      <BottomSheetModal
        trigger={onOpen => (
          <IconButton
            name="more-vert"
            _icon={{color: 'primary.contrast'}}
            onPress={onOpen}
          />
        )}>
        <EditIntervalModalContent
          siteId={siteId}
          depthInterval={interval.depthInterval}
          requiredInputs={requiredInputs}
          mutable={mutable}
        />
      </BottomSheetModal>
    </Row>
  );
};

type Props = {
  siteId: string;
  requiredInputs: (typeof soilPitMethods)[number][];
  interval: AggregatedInterval;
  data: DepthDependentSoilData | undefined;
};

export const SoilDepthIntervalSummary = ({
  siteId,
  interval,
  requiredInputs,
  data,
}: Props) => {
  const inputs: (keyof DepthDependentSoilData)[] = [
    'texture',
    'rockFragmentVolume',
    'colorValue',
  ];

  const {t} = useTranslation();

  return (
    <Column>
      <DepthIntervalEditor
        siteId={siteId}
        aggregatedInterval={interval}
        requiredInputs={requiredInputs}
      />
      {inputs.map(key => (
        <DataInputSummary
          key={key}
          required={false}
          complete={data ? data[key] !== undefined : false}
          label={t(`soil.data.${key}`)}
          onPress={() => {}}
        />
      ))}
    </Column>
  );
};
