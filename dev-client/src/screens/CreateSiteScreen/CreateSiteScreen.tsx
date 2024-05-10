/*
 * Copyright © 2023 Technology Matters
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

import {useCallback, useRef} from 'react';
import {BottomSheetModal, BottomSheetModalProvider} from '@gorhom/bottom-sheet';

import {useDispatch} from 'terraso-mobile-client/store';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {CreateSiteView} from 'terraso-mobile-client/screens/CreateSiteScreen/components/CreateSiteView';
import {
  addSite,
  fetchSitesForProject,
} from 'terraso-client-shared/site/siteSlice';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ScreenCloseButton} from 'terraso-mobile-client/navigation/components/ScreenCloseButton';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {PrivacyInfoModal} from 'terraso-mobile-client/components/modals/privacy/PrivacyInfoModal';

type Props =
  | {
      coords: Coords;
    }
  | {
      projectId: string;
    }
  | {}
  | undefined;

export const CreateSiteScreen = (props: Props = {}) => {
  const dispatch = useDispatch();
  const infoModalRef = useRef<BottomSheetModal>(null);

  const createSiteCallback = useCallback(
    async (input: SiteAddMutationInput) => {
      let result = await dispatch(addSite(input));
      if (result.payload && 'error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
        return;
      }
      if (input.projectId) {
        dispatch(fetchSitesForProject(input.projectId));
      }
      return result.payload;
    },
    [dispatch],
  );

  const onInfo = useCallback(
    () => infoModalRef.current?.present(),
    [infoModalRef],
  );
  const onInfoClose = useCallback(
    () => infoModalRef.current?.dismiss(),
    [infoModalRef],
  );

  return (
    <BottomSheetModalProvider>
      <ScreenScaffold
        BottomNavigation={null}
        AppBar={<AppBar LeftButton={<ScreenCloseButton />} />}>
        <CreateSiteView
          createSiteCallback={createSiteCallback}
          defaultProjectId={'projectId' in props ? props.projectId : undefined}
          sitePin={'coords' in props ? props.coords : undefined}
          onInfoPress={onInfo}
        />
      </ScreenScaffold>
      <PrivacyInfoModal ref={infoModalRef} onClose={onInfoClose} />
    </BottomSheetModalProvider>
  );
};
