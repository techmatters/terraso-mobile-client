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
import {useTranslation} from 'react-i18next';
import {useCallback} from 'react';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {Card} from 'terraso-mobile-client/components/Card';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Project} from 'terraso-client-shared/project/projectSlice';
import {formatDate} from 'terraso-mobile-client/util';
import {
  HStack,
  Badge,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {PeopleBadge} from 'terraso-mobile-client/components/PeopleBadge';

type Props = {
  project: Project;
};

export const ProjectPreviewCard = ({project}: Props) => {
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
          <Badge variant="chip" flexGrow={0} borderRadius={8} _text={{textTransform: 'uppercase'}}>
            {t('badge.new')}
          </Badge>
        )} **/}
        <Heading variant="h6" color="primary.main">
          {project.name}
        </Heading>
      </HStack>
      {project.description.length > 0 && <Text>{project.description}</Text>}
      <HStack space={2} alignItems="center">
        {/* TODO: Progress still not stored on backend */}
        <Text>30%</Text>
        <Badge variant="chip" startIcon={<Icon name="location-on" />}>
          {Object.keys(project.sites).length}
        </Badge>
        <PeopleBadge count={Object.keys(project.memberships).length} />
      </HStack>
    </Card>
  );
};
