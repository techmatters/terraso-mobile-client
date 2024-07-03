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

import {
  AggregatedInterval,
  selectDepthDependentData,
  useSiteProjectSoilSettings,
} from 'terraso-client-shared/selectors';
import {
  methodEnabled,
  methodRequired,
  soilPitMethods,
} from 'terraso-client-shared/soilId/soilIdSlice';

import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {
  Box,
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {EditDepthModal} from 'terraso-mobile-client/screens/SoilScreen/components/EditDepthModal';
import {
  pitMethodSummary,
  renderDepth,
} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';
import {useSelector} from 'terraso-mobile-client/store';

type DepthEditorProps = {
  siteId: string;
  aggregatedInterval: AggregatedInterval;
  requiredInputs: (typeof soilPitMethods)[number][];
};

const DepthEditor = ({
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
      <EditDepthModal
        siteId={siteId}
        depthInterval={interval.depthInterval}
        requiredInputs={requiredInputs}
        mutable={!isFromPreset}
      />
    </Row>
  );
};

type Props = {
  siteId: string;
  requiredInputs: (typeof soilPitMethods)[number][];
  interval: AggregatedInterval;
};

export const SoilDepthSummary = ({siteId, interval, requiredInputs}: Props) => {
  const {interval: depthInterval} = interval;
  const {t} = useTranslation();

  const navigation = useNavigation();

  const project = useSiteProjectSoilSettings(siteId);
  const soilData = useSelector(
    selectDepthDependentData({siteId, depthInterval}),
  );

  const methods = useMemo(() => {
    return soilPitMethods
      .filter(
        method =>
          project?.[methodRequired(method)] ||
          depthInterval[methodEnabled(method)],
      )
      .map(method => ({
        method,
        required: project?.[methodRequired(method)] ?? false,
        onPress: () =>
          navigation.navigate(`SOIL_INPUT_${method}`, {
            siteId,
            depthInterval,
          }),
      }))
      .flatMap(method =>
        method.method === 'soilTexture'
          ? [
              method,
              {
                ...method,
                method: 'rockFragmentVolume',
              } as const,
            ]
          : [method],
      )
      .map(method => ({
        ...method,
        ...pitMethodSummary(t, soilData, method.method),
      }));
  }, [t, navigation, siteId, soilData, depthInterval, project]);

  return (
    <Column space="1px">
      <DepthEditor
        siteId={siteId}
        aggregatedInterval={interval}
        requiredInputs={requiredInputs}
      />
      {methods.map(({method, summary, ...props}) => (
        <DataInputSummary
          key={method}
          label={t(`soil.collection_method.${method}`)}
          value={summary}
          {...props}
        />
      ))}
      {methods.length === 0 && <Box height="2px" />}
    </Column>
  );
};
