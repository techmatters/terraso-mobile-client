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
import {createContext, useContext} from 'react';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {selectUserRoleProject} from 'terraso-client-shared/selectors';
import {useSelector} from 'terraso-mobile-client/store';

const ProjectRoleContext = createContext<UserRole | null>(null);

type Props = {
  projectId: string;
} & React.PropsWithChildren;

export const useProjectRoleContext = () => {
  return useContext(ProjectRoleContext);
};

export const ProjectRoleContextProvider = ({projectId, children}: Props) => {
  const role = useSelector(state => selectUserRoleProject(state, projectId));

  return (
    <ProjectRoleContext.Provider value={role}>
      {children}
    </ProjectRoleContext.Provider>
  );
};
