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

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {AddTeamMemberForm} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/AddTeamMemberForm';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  projectId: string;
};

export const AddUserToProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();

  const projectName = useSelector(
    state => state.project.projects[projectId]?.name,
  );

  // FYI: There was previously a mechanism to enter emails individually, but set roles at the same time.
  // This was replaced, but we could refer back to `userRecord` in previous versions if we ever end up
  // wanting to add multiple users at the same time.

  return (
    <ScreenScaffold AppBar={<AppBar title={projectName} />}>
      <ScreenContentSection title={t('projects.add_user.heading')}>
        <Text variant="body1">{t('projects.add_user.help_text')}</Text>
        <Box mt="md">
          <AddTeamMemberForm projectId={projectId} />
        </Box>
      </ScreenContentSection>
    </ScreenScaffold>
  );
};
