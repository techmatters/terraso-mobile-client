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

import {useCallback} from 'react';

import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  addSite,
  fetchSitesForProject,
} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-client-shared/types';

import {ScreenCloseButton} from 'terraso-mobile-client/components/buttons/icons/appBar/ScreenCloseButton';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {CreateSiteView} from 'terraso-mobile-client/screens/CreateSiteScreen/components/CreateSiteView';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch} from 'terraso-mobile-client/store';

type Props =
  | {
      coords: Coords;
    }
  | {
      projectId: string;
    }
  | {
      elevation: number;
    }
  | {}
  | undefined;

export const CreateSiteScreen = (props: Props = {}) => {
  const dispatch = useDispatch();

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

  return (
    <ScreenScaffold
      BottomNavigation={null}
      AppBar={<AppBar LeftButton={<ScreenCloseButton />} />}>
      <CreateSiteView
        createSiteCallback={createSiteCallback}
        defaultProjectId={'projectId' in props ? props.projectId : undefined}
        sitePin={'coords' in props ? props.coords : undefined}
        elevation={'elevation' in props ? props.elevation : undefined}
      />
    </ScreenScaffold>
  );
};
