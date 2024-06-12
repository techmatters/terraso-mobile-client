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
import {useCallback} from 'react';

import {Project} from 'terraso-client-shared/project/projectSlice';

import {Card} from 'terraso-mobile-client/components/Card';
import {
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {PeopleBadge} from 'terraso-mobile-client/components/PeopleBadge';
import {SiteBadge} from 'terraso-mobile-client/components/SiteBadge';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type Props = {
  project: Project;
};

export const ProjectPreviewCard = ({project}: Props) => {
  const navigation = useNavigation();

  const goToProject = useCallback(async () => {
    return navigation.navigate('PROJECT_VIEW', {projectId: project.id});
  }, [project, navigation]);

  return (
    <Card onPress={goToProject}>
      <Row mb="8px">
        <Heading variant="h6" color="primary.main">
          {project.name}
        </Heading>
      </Row>
      {project.description.length > 0 && <Text>{project.description}</Text>}
      <Row space={2} pt={4} alignItems="center">
        <SiteBadge count={Object.keys(project.sites).length} />
        <PeopleBadge count={Object.keys(project.memberships).length} />
      </Row>
    </Card>
  );
};
