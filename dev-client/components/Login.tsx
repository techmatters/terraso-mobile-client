import {Button} from 'native-base';
import {useCallback} from 'react';

import {auth} from '../src/auth';
import {setHasAccessTokenAsync} from 'terraso-client-shared/account/accountSlice';
import {useDispatch} from '../model/store';

export default function LoginView(): JSX.Element {
  const dispatch = useDispatch();
  const onPress = useCallback(() => {
    auth()
      .then(() => dispatch(setHasAccessTokenAsync()))
      .catch(e => console.error(e));
  }, []);

  return (
    <Button bgColor="primary.main" size="lg" onPress={onPress}>
      Login with Google
    </Button>
  );
}
