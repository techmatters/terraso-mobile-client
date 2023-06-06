import {PropsWithChildren, createContext, useContext, useReducer} from 'react';

type LoginInfo = {name: string};
type State = {user: null | LoginInfo};

const initialState = {user: {name: 'test'}};

type ACTION_TYPE = {type: 'login'};

function loginReducer(state: State, action: ACTION_TYPE): State {
  switch (action.type) {
    case 'login': {
      return {user: {name: 'userName'}};
    }
  }
}

export const LoginContext = createContext<State>(initialState);
export const LoginDispatchContext = createContext((action: ACTION_TYPE) => {});

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
