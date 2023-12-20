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
import {CreateSiteView} from 'terraso-mobile-client/screens/CreateSiteScreen/components/CreateSiteView';
import {
  addSite,
  fetchSitesForProject,
} from 'terraso-client-shared/site/siteSlice';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {PrivacyInfoModal} from 'terraso-mobile-client/components/infoModals/PrivacyInfoModal';
import {RootNavigatorScreenProps} from 'terraso-mobile-client/navigation/types';
import {RootNavigatorScreens} from 'terraso-mobile-client/navigation/types';

type Props = RootNavigatorScreenProps<RootNavigatorScreens.CREATE_SITE>;

export const CreateSiteScreen = ({route: {params}}: Props) => {
  const coords = params && 'coords' in params ? params.coords : undefined;
  const projectId =
    params && 'projectId' in params ? params.projectId : undefined;

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
      <CreateSiteView
        createSiteCallback={createSiteCallback}
        defaultProjectId={projectId}
        sitePin={coords}
        onInfoPress={onInfo}
      />
      <PrivacyInfoModal ref={infoModalRef} onClose={onInfoClose} />
    </BottomSheetModalProvider>
  );
};
