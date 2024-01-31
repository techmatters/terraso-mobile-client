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

import {Text, useTheme} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  collectionMethods,
  methodRequired,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Switch} from 'react-native';
import {Row, Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const RequiredDataSettings = ({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) => {
  const {t} = useTranslation();
  const settings = useSelector(
    state => state.soilId.projectSettings[projectId],
  );
  const dispatch = useDispatch();
  const {colors} = useTheme();

  return (
    <Box p={4}>
      {collectionMethods.map(method => (
        <Row
          key={method}
          pt={2}
          pb={5}
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
          <Text bold pl={2} fontSize="md">
            {t(`soil.collection_method.${method}`)}
          </Text>
        </Row>
      ))}
    </Box>
  );
};
