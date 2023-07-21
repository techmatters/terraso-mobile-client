import {Badge, Box, HStack, Heading, Link, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '../../screens/AppScaffold';
import {useCallback} from 'react';
import {ProjectPreview} from '../../types';

type Props = {
  project: ProjectPreview;
};

export default function ProjectPreviewCard({project}: Props) {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const goToProject = useCallback(() => {
    return navigation.navigate('PROJECT_VIEW', {projectId: project.id});
  }, [project, navigation]);

  return (
    <Box bg="background.default" p={2} m={2}>
      <HStack space={2} pb={2}>
        {project.isNew && (
          <Badge flexGrow={0} borderRadius={8}>
            {t('badge.new').toUpperCase()}
          </Badge>
        )}
        <Heading size="md">{project.name}</Heading>
      </HStack>
      <Text>{project.description}</Text>
      <Text color="primary.main" py={2}>
        {t('general.last_modified')}: {project.lastModified}
      </Text>
      <HStack space={2} alignItems="center">
        <Text>{project.percentComplete + '%'}</Text>
        {/* TODO: Figure out how to parametrize translations */}
        <Badge bg="primary.lightest" borderRadius={10}>
          {project.siteCount + ' ' + t('general.sites')}
        </Badge>
        <Badge bg="primary.lightest" borderRadius={10}>
          {project.userCount + ' ' + t('general.users')}
        </Badge>
      </HStack>
      <Link
        _text={{color: 'primary.main'}}
        onPress={goToProject}
        alignSelf="flex-end">
        {t('projects.go_to')}
      </Link>
    </Box>
  );
}
