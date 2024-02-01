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

import {FlatList, Text} from 'native-base';
import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {Project} from 'terraso-client-shared/project/projectSlice';
import {useListFilter} from 'terraso-mobile-client/components/ListFilter';
import {ProjectPreviewCard} from 'terraso-mobile-client/screens/ProjectListScreen/components/ProjectPreviewCard';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

// TODO(performance):
// Some relevant reading: https://reactnative.dev/docs/optimizing-flatlist-configuration#windowsize
const WINDOW_SIZE = 6; // Default is 21, bringing it down as the items in this FlatList are very costly to render
const MAX_TO_RENDER_PER_BATCH = 5; // Similar as above, default is 10
// const ITEM_HEIGHT = ??
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

  // TODO(performance): Consider adjusting ProjectPreviewCard with the design team
  // to always have a fixed height so you can leverage getItemLayout (example below):
  // const getItemLayout = useCallback((_: any, index: number) => {
  //   const length = ITEM_HEIGHT + SEPARATOR_HEIGHT;
  //   const offset = length * index;
  //   return {length, offset, index};
  // }, []);

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
      // getItemLayout={getItemLayout}
      ItemSeparatorComponent={ItemSeparatorComponent}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
    />
  );
};

const keyExtractor = (project: Project) => project.id;
const ItemSeparatorComponent = () => <Box h={`${SEPARATOR_HEIGHT}px`} />;
