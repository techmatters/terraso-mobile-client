/*
 * Copyright © 2025 Technology Matters
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

import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {DataExportScreen} from 'terraso-mobile-client/screens/DataExportScreen/DataExportScreen';
import {useSelector} from 'terraso-mobile-client/store';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.EXPORT>;

/**
 * Tab screen for project export within ProjectTabNavigator
 * Gets project data from Redux and passes to generic DataExportScreen
 */
export function ProjectExportTab({route}: Props) {
  const {projectId} = route.params;
  const projectName = useSelector(
    state => state.project.projects[projectId]?.name ?? 'project',
  );

  return (
    <DataExportScreen
      resourceType="PROJECT"
      resourceId={projectId}
      resourceName={projectName}
      scope="project"
      isTab={true}
    />
  );
}
