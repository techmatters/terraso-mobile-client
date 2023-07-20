import {Box, HStack, Heading, Link, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import {ScreenRoutes} from '../../screens/constants';
import {useCallback} from 'react';
import {
  Project,
  fetchProject,
} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from '../../screens';
import {useDispatch} from '../../model/store';
import IconChip from '../common/IconChip';

type Props = {
  project: Project;
};

export default function ProjectPreviewCard({project}: Props) {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const goToProject = useCallback(async () => {
    await dispatch(fetchProject(project.id));
    return navigation.navigate(ScreenRoutes.PROJECT_VIEW);
  }, [project, navigation, dispatch]);

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
        <IconChip iconName="location-on" label={project.siteCount} />
        <IconChip iconName="people-alt" label={project.userCount} />
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
