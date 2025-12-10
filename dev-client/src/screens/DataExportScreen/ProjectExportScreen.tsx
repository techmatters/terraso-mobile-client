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

import {DataExportScreen} from 'terraso-mobile-client/screens/DataExportScreen/DataExportScreen';

type Props = {
  projectId: string;
  projectName: string;
};

/**
 * Wrapper for DataExportScreen configured for PROJECT resource type
 * Receives projectId and projectName as props from navigation
 */
export function ProjectExportScreen({projectId, projectName}: Props) {
  return (
    <DataExportScreen
      resourceType="PROJECT"
      resourceId={projectId}
      resourceName={projectName}
      scope="project"
    />
  );
}
