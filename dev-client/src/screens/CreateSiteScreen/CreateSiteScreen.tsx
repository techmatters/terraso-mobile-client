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

import {usePostHog} from 'posthog-react-native';

import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {ScreenCloseButton} from 'terraso-mobile-client/components/buttons/icons/appBar/ScreenCloseButton';
import {addSite} from 'terraso-mobile-client/model/site/siteGlobalReducer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {CreateSiteView} from 'terraso-mobile-client/screens/CreateSiteScreen/components/CreateSiteView';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  coords: Coords;
  elevation?: number;
};

export const CreateSiteScreen = (props: Props) => {
  const dispatch = useDispatch();
  const posthog = usePostHog();
  const projects = useSelector(state => state.project.projects);

  const createSiteCallback = useCallback(
    async (input: SiteAddMutationInput) => {
      let result = await dispatch(addSite(input));
      if (result.payload && 'error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
        return;
      }

      // Track site creation in PostHog
      if (result.payload) {
        const site = result.payload;

        // Get project details from the store if site has a project
        const project = site.projectId ? projects[site.projectId] : null;

        posthog?.capture('site_created', {
          site_id: site.id,
          site_name: site.name,
          latitude: site.latitude,
          longitude: site.longitude,
          project_id: site.projectId || 'none',
          project_name: project?.name || 'none',
          // Use project privacy if site is part of a project, otherwise use site's own privacy
          site_privacy: project?.privacy || site.privacy,
          project_privacy: project?.privacy || 'none',
        });
      }

      return result.payload;
    },
    [dispatch, posthog, projects],
  );

  return (
    <ScreenScaffold
      BottomNavigation={null}
      AppBar={<AppBar LeftButton={<ScreenCloseButton />} />}>
      <CreateSiteView
        createSiteCallback={createSiteCallback}
        sitePin={props.coords}
        elevation={props.elevation}
      />
    </ScreenScaffold>
  );
};
