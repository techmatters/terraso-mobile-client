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

import {useCallback} from 'react';
import {ScrollView} from 'react-native-gesture-handler';

import {Button as NbButton} from 'native-base';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {CreateSiteButton} from 'terraso-mobile-client/components/buttons/special/CreateSiteButton';
import {SlopeMeterButton} from 'terraso-mobile-client/components/buttons/special/SlopeMeterButton';
import {TextButton} from 'terraso-mobile-client/components/buttons/TextButton';
import {
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {selectPullRequested} from 'terraso-mobile-client/model/sync/syncSelectors';
import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectCurrentUserID} from 'terraso-mobile-client/store/selectors';

// TODO: I expect this to be removed or modified by the time we actually release the offline feature,
// but is helpful for manually testing
export const SyncContent = () => {
  return (
    <>
      <RestrictByFlag flag="FF_offline">
        <SyncButton />
        <PullInfo />
        <PushInfo />
        <ScrollView>
          <Heading>Button Test</Heading>
          <Heading variant="h5">TextButton</Heading>
          <TextButton label="type: default" leftIcon="info" rightIcon="info" />
          <TextButton
            label="type: destructive"
            type="destructive"
            leftIcon="info"
            rightIcon="info"
          />
          <TextButton
            label="disabled"
            disabled
            leftIcon="info"
            rightIcon="info"
          />
          <Heading variant="h5">ContainedButton</Heading>
          <ContainedButton
            label="size:SM"
            size="sm"
            leftIcon="info"
            rightIcon="info"
          />
          <ContainedButton
            label="size:MD"
            size="md"
            leftIcon="info"
            rightIcon="info"
          />
          <ContainedButton
            label="size:LG"
            size="lg"
            leftIcon="info"
            rightIcon="info"
          />
          <ContainedButton
            label="stretch"
            stretchToFit
            leftIcon="info"
            rightIcon="info"
          />
          <ContainedButton
            label="disabled"
            disabled
            leftIcon="info"
            rightIcon="info"
          />
          <Heading variant="h5">DialogButton</Heading>
          <DialogButton label="type: default" />
          <DialogButton label="type: destructive" type="destructive" />
          <DialogButton label="type: outlined" type="outlined" />
          <Heading variant="h5">SlopeMeterButton</Heading>
          <SlopeMeterButton />
          <Heading variant="h5">CreateSiteButton</Heading>
          <CreateSiteButton />
          <CreateSiteButton disabled />
        </ScrollView>
        <Heading variant="h6">FAB</Heading>
        <Fab disabled label="default" leftIcon="info" />
      </RestrictByFlag>
    </>
  );
};

export const PushInfo = () => {
  const unsyncedIds = useSelector(selectUnsyncedSiteIds);
  return <Text>({unsyncedIds.length} changed sites)</Text>;
};

export const PullInfo = () => {
  const pullRequested = useSelector(selectPullRequested);

  const requested = pullRequested ? 'requested' : 'not requested';
  return (
    <>
      <Text>{`* Pull ${requested}`}</Text>
    </>
  );
};

export const SyncButton = () => {
  const dispatch = useDispatch();

  const currentUserID = useSelector(selectCurrentUserID);

  const onSync = useCallback(() => {
    if (currentUserID !== undefined) {
      dispatch(setPullRequested(true));
    }
  }, [currentUserID, dispatch]);

  return (
    // TODO-offline: Create string in en.json if we actually want this button for reals
    <NbButton onPress={onSync}>SYNC: pull</NbButton>
  );
};
