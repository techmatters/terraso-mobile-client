import {
  Badge,
  Box,
  FlatList,
  HStack,
  Input,
  ScrollView,
  VStack,
} from 'native-base';
import {ProjectPreview} from '../../types';
import {useTranslation} from 'react-i18next';
import CreateProjectButton from './CreateProjectButton';
import MaterialIcon from '../MaterialIcon';
import ProjectPreviewCard from './ProjectPreviewCard';

type Props = {
  projects: ProjectPreview[];
};

export default function ProjectsSearchView({projects}: Props) {
  const {t} = useTranslation();
  return (
    <VStack bg="grey.200" p={5} flexGrow={1} flexShrink={0} flexBasis="70%">
      <Box alignItems="flex-start" pb={3}>
        <CreateProjectButton />
      </Box>
      <HStack alignContent="center">
        <VStack>
          <Badge
            alignSelf="flex-end"
            mb={-5}
            mr={-2}
            py={0}
            rounded="full"
            zIndex={1}
            bg="none">
            {projects.length}
          </Badge>
          <MaterialIcon
            name="filter-list"
            iconButtonProps={{color: 'grey.200'}}
            iconProps={{color: 'action.active', size: 'sm'}}
          />
        </VStack>
        {/* TODO: translation function returns null, but placeholder only accepts
        undefined */}
        <Input
          placeholder={t('search.placeholder') || undefined}
          size="sm"
          bg="background.default"
          flexGrow={1}
          ml={2}
          maxHeight={8}
        />
      </HStack>
      <FlatList
        data={projects}
        renderItem={({item}) => <ProjectPreviewCard project={item} />}
        keyExtractor={project => String(project.id)}
      />
    </VStack>
  );
}
