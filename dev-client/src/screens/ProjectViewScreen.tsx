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

import {useCallback, useState} from 'react';

import {Project} from 'terraso-client-shared/project/projectTypes';

import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {ProjectRoleContextProvider} from 'terraso-mobile-client/context/ProjectRoleContext';
import {deleteProject} from 'terraso-mobile-client/model/project/projectSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ProjectTabNavigator} from 'terraso-mobile-client/navigation/navigators/ProjectTabNavigator';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {projectId: string};

export const ProjectViewScreen = ({projectId}: Props) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const project = useSelector(
    state => state.project.projects[projectId],
  ) as Project | null;
  const handleMissingProject = useNavToBottomTabsAndShowSyncError();

  const [projectPurposelyDeleted, setProjectPurposelyDeleted] = useState(false);
  const onDeleteProject = useCallback(async () => {
    setProjectPurposelyDeleted(true);
    await dispatch(deleteProject({id: projectId}));
  }, [setProjectPurposelyDeleted, dispatch, projectId]);

  const projectPurposelyMissing = projectPurposelyDeleted && !project;
  const navToProjectsList = useCallback(() => {
    navigation.pop();
  }, [navigation]);

  const requirements = useMemoizedRequirements([
    // Note: The requirements format is rather unintuitive here
    // If you deleted the project, navigate and avoid showing the sync error
    // (as this screen re-renders after project is deleted from redux but before the dispatched delete ends)
    {data: !projectPurposelyMissing, doIfMissing: navToProjectsList},
    {data: project, doIfMissing: handleMissingProject},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ProjectRoleContextProvider projectId={projectId}>
          <ScreenScaffold
            AppBar={<AppBar title={project?.name} />}
            BottomNavigation={null}>
            <ProjectTabNavigator
              projectId={projectId}
              onDeleteProject={onDeleteProject}
            />
          </ScreenScaffold>
        </ProjectRoleContextProvider>
      )}
    </ScreenDataRequirements>
  );
};
