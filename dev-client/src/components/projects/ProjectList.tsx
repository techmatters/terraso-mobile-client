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
