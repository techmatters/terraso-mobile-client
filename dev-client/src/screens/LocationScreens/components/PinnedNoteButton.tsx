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

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type Props = {
  project: Project;
};

export const PinnedNoteButton = ({project}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onShowNote = useCallback(() => {
    return () =>
      navigation.navigate('READ_PINNED_NOTE', {
        projectId: project.id,
      });
  }, [navigation, project]);

  return (
    <ContainedButton
      onPress={onShowNote}
      leftIcon="push-pin"
      label={t('projects.inputs.instructions.add_label')}
    />
  );
};
