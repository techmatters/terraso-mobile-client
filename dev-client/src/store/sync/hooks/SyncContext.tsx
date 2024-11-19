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

import {createContext, useContext, useState} from 'react';

export type PullRequestedState = {
  pullRequested: boolean;
  setPullRequested: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PullRequestedContext = createContext<PullRequestedState>({
  pullRequested: false,
  setPullRequested: () => {},
});

export const PullContextProvider = ({children}: React.PropsWithChildren) => {
  const [pullRequested, setPullRequested] = useState<boolean>(false);
  // TODO-cknipe: Remove this
  console.log('PullContextProvider is rendering');
  return (
    <PullRequestedContext.Provider value={{pullRequested, setPullRequested}}>
      {children}
    </PullRequestedContext.Provider>
  );
};

// Requires PullRequester to set the state correctly
export const usePullRequested = () => {
  const context = useContext(PullRequestedContext);
  return context;
};
