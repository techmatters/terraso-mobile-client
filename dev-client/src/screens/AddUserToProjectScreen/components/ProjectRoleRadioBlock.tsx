/*
 * Copyright © 2024 Technology Matters
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

import {ProjectMembershipProjectRoleChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {ProjectRole} from 'terraso-client-shared/project/projectSlice';

import {
  Column,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';

export type Props = {
  onChange: (value: ProjectMembershipProjectRoleChoices) => void;
  selectedRole: ProjectMembershipProjectRoleChoices;
};

export const ProjectRoleRadioBlock = ({onChange, selectedRole}: Props) => {
  const {t} = useTranslation();
  return (
    <Column>
      <Heading variant="h6">{t('projects.manage_member.project_role')}</Heading>
      <RadioBlock<ProjectRole>
        labelProps={{variant: 'secondary'}}
        options={{
          VIEWER: {
            text: t('general.role.VIEWER'),
            helpText: t('projects.manage_member.viewer_help'),
          },
          CONTRIBUTOR: {
            text: t('general.role.CONTRIBUTOR'),
            helpText: t('projects.manage_member.contributor_help'),
          },
          MANAGER: {
            text: t('general.role.MANAGER'),
            helpText: t('projects.manage_member.manager_help'),
          },
        }}
        groupProps={{
          onChange: onChange,
          value: selectedRole,
          name: 'selected-role',
        }}
      />
    </Column>
  );
};
