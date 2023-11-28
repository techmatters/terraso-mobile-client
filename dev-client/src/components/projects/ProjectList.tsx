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
import {Box, FlatList, Text} from 'native-base';
import ProjectPreviewCard from 'terraso-mobile-client/components/projects/ProjectPreviewCard';
import {useListFilter} from 'terraso-mobile-client/components/common/ListFilter';
import {Project} from 'terraso-client-shared/project/projectSlice';
import {useTranslation} from 'react-i18next';

const ProjectList = () => {
  const {t} = useTranslation();
  const {filteredItems} = useListFilter<Project>();
  return (
    <FlatList
      data={filteredItems}
      renderItem={({item}) => <ProjectPreviewCard project={item} />}
      ItemSeparatorComponent={() => <Box h="8px" />}
      keyExtractor={project => project.id}
      ListEmptyComponent={<Text>{t('projects.search.no_matches')}</Text>}
    />
  );
};

export default ProjectList;
