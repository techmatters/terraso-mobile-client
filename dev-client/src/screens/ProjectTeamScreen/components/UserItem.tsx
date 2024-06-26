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
import {StyleSheet} from 'react-native';

import {Button, Pressable} from 'native-base';

import {User} from 'terraso-client-shared/account/accountSlice';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {Box, Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {UserInfo} from 'terraso-mobile-client/screens/ProjectTeamScreen/components/UserInfo';

type TriggerProps = {
  onOpen: () => void;
  message: string;
};

function LeaveProjectTrigger({onOpen, message}: TriggerProps) {
  return (
    <Button
      size="md"
      mt="10px"
      ml="50px"
      style={styles.button}
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

  /*
   * Any non-manager user can leave the project, but managers can only leave if they are not the
   * only manager.
   */
  const userCanLeaveProject =
    isForCurrentUser && !(isInManagerView && isForSingleManagerProject);

  return (
    <Box width="100%" py={5}>
      <Column>
        {!isForCurrentUser && isInManagerView ? (
          <Pressable onPress={memberAction}>
            <UserInfo
              membership={membership}
              user={user}
              isCurrentUser={isForCurrentUser}
            />
          </Pressable>
        ) : (
          <UserInfo
            membership={membership}
            user={user}
            isCurrentUser={isForCurrentUser}
          />
        )}
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
      </Column>
    </Box>
  );
};

const styles = StyleSheet.create({button: {alignSelf: 'flex-start'}});
