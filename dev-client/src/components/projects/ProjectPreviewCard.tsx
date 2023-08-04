import {Box, HStack, Heading, Link, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useCallback} from 'react';
import {Project} from 'terraso-client-shared/project/projectSlice';
import IconChip from '../common/IconChip';
import {useNavigation} from '../../screens/AppScaffold';

type Props = {
  project: Project;
};

export default function ProjectPreviewCard({project}: Props) {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const goToProject = useCallback(async () => {
    return navigation.navigate('PROJECT_VIEW', {project: project});
  }, [project, navigation]);

  return (
    <Box bg="background.default" p={2} m={2}>
      <HStack space={2} pb={2}>
        {/** TODO: backend does not have isNew status
        {project.isNew && (
          <Badge flexGrow={0} borderRadius={8}>
            {t('badge.new').toUpperCase()}
          </Badge>
        )} **/}
        <Heading size="md">{project.name}</Heading>
      </HStack>
      <Text>{project.description}</Text>
      <Text color="primary.main" py={2}>
        {t('general.last_modified')}: {project.updatedAt}
      </Text>
      <HStack space={2} alignItems="center">
        {/* TODO: Progress still not stored on backend */}
        <Text>30%</Text>
        <IconChip
          iconName="location-on"
          label={Object.keys(project.siteIds).length}
        />
        <IconChip
          iconName="people-alt"
          label={Object.keys(project.membershipIds).length}
        />
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
