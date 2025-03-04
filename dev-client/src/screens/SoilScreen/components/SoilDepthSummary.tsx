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

import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {Box, Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  methodEnabled,
  methodRequired,
  soilPitMethods,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {DepthEditor} from 'terraso-mobile-client/screens/SoilScreen/components/DepthEditor';
import {pitMethodSummary} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';
import {useSelector} from 'terraso-mobile-client/store';
import {AggregatedInterval} from 'terraso-mobile-client/store/depthIntervalHelpers';
import {
  selectDepthDependentData,
  useSiteProjectSoilSettings,
} from 'terraso-mobile-client/store/selectors';

type Props = {
  siteId: string;
  requiredInputs: (typeof soilPitMethods)[number][];
  interval: AggregatedInterval;
};

export const SoilDepthSummary = ({siteId, interval, requiredInputs}: Props) => {
  const {interval: depthInterval} = interval;
  const {t, i18n} = useTranslation();

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

  // Texture Class needs a different label on the Soil tab.
  return (
    <Column space="1px">
      <DepthEditor
        siteId={siteId}
        aggregatedInterval={interval}
        requiredInputs={requiredInputs}
      />
      {methods.map(({method, summary, ...props}) => {
        const summaryDescriptionExists = i18n.exists(
          `soil.collection_method_summary.${method}`,
        );
        const description = summaryDescriptionExists
          ? `soil.collection_method_summary.${method}`
          : `soil.collection_method.${method}`;

        return (
          <DataInputSummary
            key={method}
            label={t(description)}
            value={summary}
            {...props}
          />
        );
      })}
      {methods.length === 0 && <Box height="2px" />}
    </Column>
  );
};
