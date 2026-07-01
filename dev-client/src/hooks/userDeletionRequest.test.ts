/*
 * Copyright © 2026 Technology Matters
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

import {act, renderHook, waitFor} from '@testing-library/react-native';

import {
  deleteUserAccount,
  setAccountDeletedEmail,
  signOut,
} from 'terraso-client-shared/account/accountSlice';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useUserDeletionRequests} from 'terraso-mobile-client/hooks/userDeletionRequest';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {userLoggedOut} from 'terraso-mobile-client/store/logoutActions';

jest.mock('terraso-mobile-client/store', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => ({
  useIsOffline: jest.fn(() => false),
}));

jest.mock('terraso-client-shared/account/accountSlice', () => ({
  deleteUserAccount: jest.fn(),
  setAccountDeletedEmail: jest.fn(input => ({
    type: 'setEmail',
    payload: input,
  })),
  signOut: jest.fn(() => ({type: 'signOut'})),
}));

jest.mock('terraso-mobile-client/store/logoutActions', () => ({
  userLoggedOut: jest.fn(() => ({type: 'userLoggedOut'})),
}));

const mockUseDispatch = useDispatch as jest.Mock;
const mockUseSelector = useSelector as jest.Mock;
const mockUseIsOffline = useIsOffline as jest.Mock;
const mockDeleteUserAccount = deleteUserAccount as unknown as jest.Mock;

const aUser = {
  id: 'user-1',
  email: 'me@example.com',
  firstName: 'M',
  lastName: 'E',
  profileImage: '',
  preferences: {} as Record<string, string>,
};

const mockState = (user: typeof aUser | null) => {
  mockUseSelector.mockImplementation(selector =>
    selector({account: {currentUser: {data: user}}} as any),
  );
};

describe('useUserDeletionRequests', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(dispatch);
    mockUseIsOffline.mockReturnValue(false);
  });

  it('exposes the current user and pending=false when the pref is unset', () => {
    mockState(aUser);
    const {result} = renderHook(() => useUserDeletionRequests());
    expect(result.current.user).toBe(aUser);
    expect(result.current.isPending).toBe(false);
  });

  it('reports isPending when the pref is "true"', () => {
    mockState({...aUser, preferences: {account_deletion_request: 'true'}});
    const {result} = renderHook(() => useUserDeletionRequests());
    expect(result.current.isPending).toBe(true);
  });

  it('reflects connectivity state in isOffline', () => {
    mockState(aUser);
    mockUseIsOffline.mockReturnValue(true);
    const {result} = renderHook(() => useUserDeletionRequests());
    expect(result.current.isOffline).toBe(true);
  });

  it('on clean delete: dispatches userLoggedOut, signOut, setAccountDeletedEmail in order', async () => {
    mockState(aUser);
    // unwrap() returns the deleteUserAccount payload directly.
    const unwrap = jest.fn().mockResolvedValue({
      kind: 'deleted',
      email: aUser.email,
    });
    mockDeleteUserAccount.mockReturnValue({unwrap, type: 'thunk'});
    dispatch.mockReturnValue({unwrap});

    const {result} = renderHook(() => useUserDeletionRequests());
    await act(async () => {
      await result.current.requestDeletion();
    });

    // userLoggedOut + signOut + setAccountDeletedEmail were dispatched.
    expect(userLoggedOut).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(setAccountDeletedEmail).toHaveBeenCalledWith(aUser.email);
  });

  it('on blocked delete: does NOT dispatch sign-out actions (thunk handles pref)', async () => {
    mockState(aUser);
    const unwrap = jest.fn().mockResolvedValue({
      kind: 'blocked',
      blockers: [
        {
          model: 'story_map.StoryMap',
          qualifier: null,
          field: 'created_by',
          count: 1,
          ids: ['x'],
        },
      ],
    });
    dispatch.mockReturnValue({unwrap});

    const {result} = renderHook(() => useUserDeletionRequests());
    await act(async () => {
      await result.current.requestDeletion();
    });

    expect(userLoggedOut).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(setAccountDeletedEmail).not.toHaveBeenCalled();
  });

  it('isSaving flips during the in-flight mutation', async () => {
    mockState(aUser);
    let resolve: (v: any) => void = () => {};
    const unwrap = jest.fn(
      () => new Promise(r => (resolve = r as (v: any) => void)),
    );
    dispatch.mockReturnValue({unwrap});

    const {result} = renderHook(() => useUserDeletionRequests());
    expect(result.current.isSaving).toBe(false);
    act(() => {
      result.current.requestDeletion();
    });
    await waitFor(() => expect(result.current.isSaving).toBe(true));

    await act(async () => {
      resolve({kind: 'blocked', blockers: []});
    });
    await waitFor(() => expect(result.current.isSaving).toBe(false));
  });
});
