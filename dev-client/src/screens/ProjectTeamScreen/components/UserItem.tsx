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

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {Button} from 'native-base';

import {User} from 'terraso-client-shared/account/accountSlice';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';

import {ProfilePic} from 'terraso-mobile-client/components/content/images/ProfilePic';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {RolePill} from 'terraso-mobile-client/screens/ProjectTeamScreen/components/RolePill';
import {formatName} from 'terraso-mobile-client/util';

type TriggerProps = {
  onOpen: () => void;
  message: string;
};

function LeaveProjectTrigger({onOpen, message}: TriggerProps) {
  return (
    <Button
      size="sm"
      _text={{color: 'error.main'}}
      _pressed={{backgroundColor: '#ff0000'}}
      bgColor="grey.200"
      onPress={onOpen}>
      {message}
    </Button>
  );
}

type ItemProps = {
  membership: ProjectMembership;
  user: User;
  isForCurrentUser: boolean;
  isInManagerView: boolean;
  isForSingleManagerProject: boolean;
  removeUser: () => void;
  memberAction: () => void;
};

export const UserItem = ({
  membership,
  user,
  isForCurrentUser,
  isInManagerView,
  isForSingleManagerProject,
  removeUser,
  memberAction,
}: ItemProps) => {
  const {t} = useTranslation();

  const userLabel = useMemo(() => {
    let name = formatName(user.firstName, user.lastName);
    if (isForCurrentUser) {
      return t('general.you_name', {name: name});
    } else {
      return name;
    }
  }, [user, isForCurrentUser, t]);

  /*
   * Any non-manager user can leave the project, but managers can only leave if they are not the
   * only manager.
   */
  const userCanLeaveProject =
    isForCurrentUser && !(isInManagerView && isForSingleManagerProject);

  return (
    <MenuItem
      icon={<ProfilePic user={user} />}
      label={userLabel}
      pill={<RolePill membership={membership} />}
      onPress={isForCurrentUser ? undefined : memberAction}>
      {userCanLeaveProject && (
        <ConfirmModal
          trigger={onOpen => (
            <LeaveProjectTrigger
              onOpen={onOpen}
              message={t('projects.team.leave_project_modal.trigger')}
            />
          )}
          title={t('projects.team.leave_project_modal.title')}
          body={t('projects.team.leave_project_modal.body')}
          actionName={t('projects.team.leave_project_modal.action_name')}
          handleConfirm={removeUser}
        />
      )}
    </MenuItem>
  );
};
