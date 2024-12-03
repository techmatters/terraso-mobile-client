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

import {useEffect} from 'react';

import {render} from '@testing/integration/utils';

import {selectPullRequested} from 'terraso-mobile-client/model/sync/syncSelectors';
import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {AppState, useDispatch, useSelector} from 'terraso-mobile-client/store';
import * as syncHooks from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {
  PULL_INTERVAL_MS,
  PullRequester,
} from 'terraso-mobile-client/store/sync/PullRequester';

jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
  return {
    useDebouncedIsOffline: jest.fn(),
    useSyncErrorSiteIds: jest.fn(),
  };
});

type Props = {
  mock: ReturnType<typeof jest.fn>;
  newPullRequested?: boolean;
};

// We can read the value of pullRequested, by testing what the mock was last called with.
const ExposePullRequestedForTest = ({mock, newPullRequested}: Props) => {
  const pullRequested = useSelector(selectPullRequested);
  const dispatch = useDispatch();

  useEffect(() => {
    mock(pullRequested);
  }, [pullRequested, mock]);

  useEffect(() => {
    if (newPullRequested !== undefined) {
      dispatch(setPullRequested(newPullRequested));
    }
  }, [newPullRequested, dispatch]);

  return <></>;
};

type RenderedScreen = ReturnType<typeof render>;

const renderTestComponents = (initialState?: Partial<AppState>) => {
  const mock = jest.fn();
  const screen = render(
    <>
      <PullRequester />
      <ExposePullRequestedForTest mock={mock} />
    </>,
    {initialState: initialState},
  );
  return {screen, mock};
};

const setPullRequestedFalse = (screen: RenderedScreen) => {
  screen.rerender(
    <>
      <PullRequester />
      <ExposePullRequestedForTest mock={jest.fn()} newPullRequested={false} />
    </>,
  );
};

const rerenderTestComponents = (
  screen: RenderedScreen,
  newPullRequested?: boolean,
) => {
  const mock = jest.fn();
  screen.rerender(
    <>
      <PullRequester />
      <ExposePullRequestedForTest
        mock={mock}
        newPullRequested={newPullRequested}
      />
    </>,
  );
  return mock;
};

describe('PullRequester', () => {
  test('requests pull on first mount', () => {
    const {mock} = renderTestComponents();
    expect(mock).toHaveBeenLastCalledWith(true);
  });

  test('does not request pull immediately after pull is set to false', () => {
    const {screen} = renderTestComponents();
    // This and all following tests should set pullRequested to false after first render
    // because (as test above shows) first render will always set it to true
    setPullRequestedFalse(screen);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });
});

describe('PullRequester + isOffline', () => {
  let useDebouncedIsOffline = jest.mocked(syncHooks.useDebouncedIsOffline);

  beforeEach(() => {
    useDebouncedIsOffline.mockReset();
  });

  test('requests pull when coming online from offline', () => {
    useDebouncedIsOffline.mockReturnValue(true);
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    useDebouncedIsOffline.mockReturnValue(false);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(true);
  });

  test('does not request pull when going offline from online', () => {
    useDebouncedIsOffline.mockReturnValue(false);
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    useDebouncedIsOffline.mockReturnValue(true);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });

  test('does not request pull when consistently online', () => {
    useDebouncedIsOffline.mockClear().mockReturnValue(false);
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });
});

describe('PullRequester + sites with errors', () => {
  let useSyncErrorSiteIds = jest.mocked(syncHooks.useSyncErrorSiteIds);

  beforeEach(() => {
    useSyncErrorSiteIds.mockReset();
  });

  test('requests pull when site has sync error', () => {
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    useSyncErrorSiteIds.mockReturnValue(['site1']);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(true);
  });

  test('does not request pull when no sites have sync errors', () => {
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    useSyncErrorSiteIds.mockReturnValue([]);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });
});

describe('PullRequester + interval', () => {
  jest.useFakeTimers();

  test('requests pull after specified amount of time', () => {
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    jest.advanceTimersByTime(PULL_INTERVAL_MS + 1);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(true);
  });

  test('does not request pull before specified amount of time', () => {
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    jest.advanceTimersByTime(PULL_INTERVAL_MS - 1);
    const mock = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });
});
