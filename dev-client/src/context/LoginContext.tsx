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

import {PropsWithChildren, createContext, useContext, useReducer} from 'react';

type LoginInfo = {name: string};
type State = {user: null | LoginInfo};

const initialState = {user: null};

type ACTION_TYPE = {type: 'login'; name: string};

function loginReducer(state: State, action: ACTION_TYPE): State {
  switch (action.type) {
    case 'login': {
      return {user: {name: action.name}};
    }
  }
}

export const LoginContext = createContext<State>(initialState);
export const LoginDispatchContext = createContext((_: ACTION_TYPE) => {});

export function LoginProvider({children}: PropsWithChildren) {
  const [state, dispatch] = useReducer(loginReducer, initialState);

  return (
    <LoginContext.Provider value={state}>
      <LoginDispatchContext.Provider value={dispatch}>
        {children}
      </LoginDispatchContext.Provider>
    </LoginContext.Provider>
  );
}

export function useLogin() {
  return useContext(LoginContext);
}

export function useLoginDispatch() {
  return useContext(LoginDispatchContext);
}
