import {Badge, Box, FlatList, HStack, Input, VStack} from 'native-base';
import {ProjectPreview} from '../../types';
import {useTranslation} from 'react-i18next';
import AddButton from '../common/AddButton';
import {IconButton} from '../common/Icons';
import ProjectPreviewCard from './ProjectPreviewCard';
import {useNavigation} from '../../screens/AppScaffold';
import {useCallback} from 'react';

type Props = {
  projects: ProjectPreview[];
};

export default function ProjectsSearchView({projects}: Props) {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const onPress = useCallback(
    () => navigation.navigate('CREATE_PROJECT'),
    [navigation],
  );
  return (
    <VStack bg="grey.200" p={5} flexGrow={1} flexShrink={0} flexBasis="70%">
      <Box alignItems="flex-start" pb={3}>
        <AddButton text={t('projects.create_button')} buttonProps={{onPress}} />
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
          <IconButton
            name="filter-list"
            color="grey.200"
            _icon={{color: 'action.active', size: 'sm'}}
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
