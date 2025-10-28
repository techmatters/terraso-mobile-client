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

import {Coords} from 'terraso-client-shared/types';

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {UpdatedPermissionsRequestWrapper} from 'terraso-mobile-client/components/modals/PermissionsRequestWrapper';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useUpdatedForegroundPermissions} from 'terraso-mobile-client/hooks/appPermissionsHooks';
import {MapSearch} from 'terraso-mobile-client/screens/SitesScreen/components/search/MapSearch';

type Props = {
  zoomTo?: (coords: Coords) => void;
  zoomToUser?: () => void;
  toggleMapLayer?: () => void;
};

export const MapHeader = ({zoomTo, zoomToUser, toggleMapLayer}: Props) => {
  const {t} = useTranslation();

  return (
    <Box
      flex={1}
      left={0}
      position="absolute"
      right={0}
      top={0}
      zIndex={1}
      px={3}
      py={3}
      pointerEvents="box-none">
      <Row space={3} pointerEvents="box-none">
        <MapSearch zoomTo={zoomTo} />
        <Column space={3}>
          <Box onStartShouldSetResponder={() => true}>
            <IconButton
              name="layers"
              variant="light-filled"
              type="md"
              onPress={toggleMapLayer}
            />
          </Box>
          <UpdatedPermissionsRequestWrapper
            requestModalTitle={t('permissions.location_title')}
            requestModalBody={t('permissions.location_body')}
            permissionHook={useUpdatedForegroundPermissions}
            permissionedAction={zoomToUser}>
            {onRequest => (
              <Box onStartShouldSetResponder={() => true}>
                <IconButton
                  name="my-location"
                  variant="light-filled"
                  type="md"
                  onPress={onRequest}
                />
              </Box>
            )}
          </UpdatedPermissionsRequestWrapper>
        </Column>
      </Row>
    </Box>
  );
};
