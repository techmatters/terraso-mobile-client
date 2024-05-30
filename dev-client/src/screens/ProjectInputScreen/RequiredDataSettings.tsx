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

import React from 'react';
import {useTranslation} from 'react-i18next';
import {Switch} from 'react-native';

import {useTheme} from 'native-base';

import {useProjectSoilSettings} from 'terraso-client-shared/selectors';
import {
  collectionMethods,
  methodRequired,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';

import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SWITCH_PADDING} from 'terraso-mobile-client/constants';
import {useDispatch} from 'terraso-mobile-client/store';

export const RequiredDataSettings = ({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) => {
  const {t} = useTranslation();
  const settings = useProjectSoilSettings(projectId);
  const dispatch = useDispatch();
  const {colors} = useTheme();

  return (
    <Box p={4}>
      {collectionMethods.map(method => {
        const description = t(
          `soil.collection_method_description.${method}`,
          '',
        );
        return (
          <React.Fragment key={method}>
            <Row
              pt={2}
              mb={description ? 2 : 5}
              justifyContent="flex-start"
              alignItems="center">
              <Switch
                disabled={!enabled}
                value={settings[methodRequired(method)]}
                thumbColor={
                  settings[methodRequired(method)]
                    ? colors.primary.main
                    : colors.primary.contrast
                }
                onValueChange={value => {
                  dispatch(
                    updateProjectSoilSettings({
                      projectId,
                      [methodRequired(method)]: value,
                    }),
                  );
                }}
              />
              <Text variant="body1" bold pl={SWITCH_PADDING}>
                {t(`soil.collection_method.${method}`)}
              </Text>
            </Row>
            {description && (
              <Row mb={4}>
                <Text variant="body2">{description}</Text>
              </Row>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};
