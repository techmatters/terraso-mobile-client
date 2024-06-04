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

import {FlatList} from 'native-base';

import {Project} from 'terraso-client-shared/project/projectSlice';

import {useListFilter} from 'terraso-mobile-client/components/ListFilter';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ProjectPreviewCard} from 'terraso-mobile-client/screens/ProjectListScreen/components/ProjectPreviewCard';

const WINDOW_SIZE = 6; // Default is 21, bringing it down as the items in this FlatList are very costly to render
const MAX_TO_RENDER_PER_BATCH = 5; // Similar as above, default is 10
const SEPARATOR_HEIGHT = 8;

type RenderItemProps = {
  item: Project;
};

export const ProjectList = () => {
  const {t} = useTranslation();
  const {filteredItems} = useListFilter<Project>();

  const renderItem = useCallback(
    ({item}: RenderItemProps) => <ProjectPreviewCard project={item} />,
    [],
  );

  const ListEmptyComponent = useMemo(
    () => <Text>{t('projects.search.no_matches')}</Text>,
    [t],
  );

  return (
    <FlatList
      data={filteredItems}
      renderItem={renderItem}
      windowSize={WINDOW_SIZE}
      maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
      ItemSeparatorComponent={ItemSeparatorComponent}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
    />
  );
};

const keyExtractor = (project: Project) => project.id;
const ItemSeparatorComponent = () => <Box h={`${SEPARATOR_HEIGHT}px`} />;
