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
import {useTranslation} from 'react-i18next';

import {Project} from 'terraso-client-shared/project/projectTypes';

import {Card} from 'terraso-mobile-client/components/Card';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Row, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type Props = {
  project: Project;
};

export const PinnedNoteCard = ({project}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onShowNote = useCallback(() => {
    navigation.navigate('READ_PINNED_NOTE', {
      projectId: project.id,
    });
  }, [navigation, project]);

  return (
    <Card
      alignItems="flex-start"
      shadow={4}
      mb={4}
      ml={4}
      mr={4}
      onPress={onShowNote}>
      <Row>
        <Icon name="push-pin" color="primary.dark" size="sm" mr={1} />
        <Text bold fontSize="md">
          {t('site.notes.pinned_note')}
        </Text>
      </Row>
      <Text pt={1} fontSize="md" numberOfLines={3} ellipsizeMode="tail">
        {project.siteInstructions}
      </Text>
    </Card>
  );
};
