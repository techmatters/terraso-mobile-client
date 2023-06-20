import {Badge, Box, HStack, Heading, Link, Text} from 'native-base';
import {ProjectPreview} from '../../types';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {RootStackParamList, ScreenRoutes} from '../../screens/constants';
import {useCallback} from 'react';
import {fetchProject} from '../../dataflow';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type Props = {
  project: ProjectPreview;
};

// see https://reactnavigation.org/docs/typescript/#type-checking-screens
type ProjectListProp = NativeStackNavigationProp<
  RootStackParamList,
  ScreenRoutes.PROJECT_LIST
>;

export default function ProjectPreviewCard({project}: Props) {
  const {t} = useTranslation();
  // see https://reactnavigation.org/docs/typescript/#annotating-usenavigation
  // TODO: Wrap this in our own custom hook?
  const navigation = useNavigation<ProjectListProp>();

  const goToProject = useCallback(() => {
    const p = fetchProject(project.id);
    return navigation.navigate(ScreenRoutes.PROJECT_VIEW, {project: p});
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
