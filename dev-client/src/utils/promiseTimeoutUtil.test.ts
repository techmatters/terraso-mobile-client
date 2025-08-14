/*
 * Copyright © 2025 Technology Matters
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

import {doPromiseWithTimeoutAndLateReturn} from 'terraso-mobile-client/utils/promiseTimeoutUtil';

describe('doPromiseWithTimeoutAndLateReturn', () => {
  const timeoutMs = 1000;

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const setupTestWithPromiseDuration = (promiseDuration: number) => {
    let status = 'Start';

    const doOnPromiseReturn = jest.fn(() => {
      status = 'Promise done';
      return 'Promise done';
    });

    const promiseToDo = new Promise<string>(resolve => {
      setTimeout(() => resolve(doOnPromiseReturn()), promiseDuration);
    });

    const doOnTimeout = jest.fn(() => {
      status = 'Timeout';
      return 'Timeout';
    });

    const doOnReturnAfterTimeout = jest.fn(() => {
      status = 'Promise done late';
      return 'Promise done late';
    });

    const racingPromise = doPromiseWithTimeoutAndLateReturn({
      timeoutMs,
      promiseToDo,
      doOnTimeout,
      doOnReturnAfterTimeout,
    });

    return {
      // Getter function to access current status (which will still exist due to JS closures)
      status: () => status,
      mocks: {
        doOnPromiseReturn,
        doOnTimeout,
        doOnReturnAfterTimeout,
      },
      racingPromise,
      promiseDuration,
    };
  };

  test('returns the original promise result if fast enough', async () => {
    const scenario = setupTestWithPromiseDuration(1);

    await jest.advanceTimersByTimeAsync(scenario.promiseDuration);
    await jest.advanceTimersByTimeAsync(timeoutMs);
    const promiseReturn = await scenario.racingPromise;

    expect(promiseReturn).toBe('Promise done');
    expect(scenario.status()).toBe('Promise done');
    expect(scenario.mocks.doOnPromiseReturn).toHaveBeenCalled();
    expect(scenario.mocks.doOnTimeout).not.toHaveBeenCalled();
    expect(scenario.mocks.doOnReturnAfterTimeout).not.toHaveBeenCalled();
  });

  test('returns the timeout result if original promise is too slow', async () => {
    const scenario = setupTestWithPromiseDuration(2000);

    await jest.advanceTimersByTimeAsync(timeoutMs);
    const promiseReturn = await scenario.racingPromise;

    expect(promiseReturn).toBe('Timeout');
    expect(scenario.status()).toBe('Timeout');
    expect(scenario.mocks.doOnPromiseReturn).not.toHaveBeenCalled();
    expect(scenario.mocks.doOnTimeout).toHaveBeenCalled();
    expect(scenario.mocks.doOnReturnAfterTimeout).not.toHaveBeenCalled();
  });

  test('does the after-timeout behavior if original promise returns later', async () => {
    const scenario = setupTestWithPromiseDuration(2000);

    await jest.advanceTimersByTimeAsync(timeoutMs);
    const promiseReturn = await scenario.racingPromise;

    await jest.advanceTimersByTimeAsync(scenario.promiseDuration);

    // promiseToDo is orphaned after the timeout, so its return value is not used
    expect(promiseReturn).toBe('Timeout');
    expect(scenario.status()).toBe('Promise done late');
    expect(scenario.mocks.doOnPromiseReturn).toHaveBeenCalled();
    expect(scenario.mocks.doOnTimeout).toHaveBeenCalled();
    expect(scenario.mocks.doOnReturnAfterTimeout).toHaveBeenCalled();
  });
});
