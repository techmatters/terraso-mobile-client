import {Badge, HStack, Heading, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useCallback} from 'react';
import {Project} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from '../../screens/AppScaffold';
import {Card} from '../common/Card';
import {Icon} from '../common/Icons';

type Props = {
  project: Project;
};

export default function ProjectPreviewCard({project}: Props) {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const goToProject = useCallback(async () => {
    return navigation.navigate('PROJECT_VIEW', {projectId: project.id});
  }, [project, navigation]);

  return (
    <Card onPress={goToProject}>
      <HStack mb="8px">
        {/** TODO: backend does not have isNew status
        {project.isNew && (
          <Badge flexGrow={0} borderRadius={8}>
            {t('badge.new').toUpperCase()}
          </Badge>
        )} **/}
        <Heading variant="h6" color="primary.main">
          {project.name}
        </Heading>
      </HStack>
      {project.description.length > 0 && <Text>{project.description}</Text>}
      <Text variant="subtitle2" color="text.secondary" mb="16px">
        {t('general.last_modified')}: {project.updatedAt}
      </Text>
      <HStack space={2} alignItems="center">
        {/* TODO: Progress still not stored on backend */}
        <Text>30%</Text>
        <Badge
          variant="chip"
          backgroundColor="primary.lightest"
          startIcon={<Icon name="location-on" />}>
          {Object.keys(project.siteIds).length}
        </Badge>
        <Badge
          variant="chip"
          backgroundColor="primary.lightest"
          startIcon={<Icon name="people-alt" />}>
          {Object.keys(project.membershipIds).length}
        </Badge>
      </HStack>
    </Card>
  );
}
