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

type PromiseWithTimeoutArgs<T> = {
  timeoutMs: number;
  promiseToDo: Promise<T>;
  doOnTimeout: () => T;
  doOnReturnAfterTimeout: (response: T) => void;
};
export const doPromiseWithTimeoutAndLateReturn = async <T>({
  timeoutMs,
  promiseToDo,
  doOnTimeout,
  doOnReturnAfterTimeout,
}: PromiseWithTimeoutArgs<T>): Promise<T> => {
  let timeoutHappened = false;
  let promiseResolved = false;
  const timeoutPromise = new Promise<T>(resolve => {
    setTimeout(() => {
      if (!promiseResolved) {
        timeoutHappened = true;
        resolve(doOnTimeout());
      }
    }, timeoutMs);
  });

  const promiseWithThen = promiseToDo.then(response => {
    if (timeoutHappened) {
      // If the timeout already happened, any value returned by the promise will not be used, so you may need to re-dispatch if you want to update redux state. (We return here just to make the types align.)
      doOnReturnAfterTimeout(response);
      return response;
    } else {
      promiseResolved = true;
      return response;
    }
  });

  return await Promise.race([promiseWithThen, timeoutPromise]);
};
