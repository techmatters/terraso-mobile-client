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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  projectId: string | null;
  setProjectId: (projectId: string | null) => void;
};

export const ProjectSelect = ({projectId, setProjectId}: Props) => {
  const {t} = useTranslation();
  const projects = useSelector(state => state.project.projects);
  const projectList = useMemo(() => Object.keys(projects), [projects]);
  const renderProject = useCallback(
    (id: string) => projects[id].name,
    [projects],
  );

  return (
    <Select
      nullable
      options={projectList}
      value={projectId}
      onValueChange={setProjectId}
      unselectedLabel={t('general.nullable_option')}
      renderValue={renderProject}
    />
  );
};
