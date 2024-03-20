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
import {
  methodEnabled,
  methodRequired,
  soilPitMethods,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {
  selectDepthDependentData,
  useSiteProjectSoilSettings,
} from 'terraso-client-shared/selectors';
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {EditIntervalModalContent} from 'terraso-mobile-client/screens/SoilScreen/components/EditIntervalModalContent';
import {BottomSheetModal} from 'terraso-mobile-client/components/BottomSheetModal';
import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {useTranslation} from 'react-i18next';
import {AggregatedInterval} from 'terraso-client-shared/selectors';
import {useMemo} from 'react';
import {useSelector} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  pitMethodSummary,
  renderDepthInterval,
} from 'terraso-mobile-client/screens/SoilScreen/utils/renderValues';
import {
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type DepthIntervalEditorProps = {
  siteId: string;
  aggregatedInterval: AggregatedInterval;
  requiredInputs: (typeof soilPitMethods)[number][];
};

const DepthIntervalEditor = ({
  siteId,
  aggregatedInterval: {isFromPreset, interval},
  requiredInputs,
}: DepthIntervalEditorProps) => {
  const {t} = useTranslation();

  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {renderDepthInterval(t, interval)}
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
          mutable={!isFromPreset}
        />
      </BottomSheetModal>
    </Row>
  );
};

type Props = {
  siteId: string;
  requiredInputs: (typeof soilPitMethods)[number][];
  interval: AggregatedInterval;
};

export const SoilDepthIntervalSummary = ({
  siteId,
  interval,
  requiredInputs,
}: Props) => {
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
      <DepthIntervalEditor
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
    </Column>
  );
};
