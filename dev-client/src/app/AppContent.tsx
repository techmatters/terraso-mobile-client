import {OfflineSnackbar} from 'terraso-mobile-client/components/messages/OfflineSnackbar';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {RootNavigator} from 'terraso-mobile-client/navigation/navigators/RootNavigator';
import {PullDispatcher} from 'terraso-mobile-client/store/sync/PullDispatcher';
import {PullRequester} from 'terraso-mobile-client/store/sync/PullRequester';
import {PushDispatcher} from 'terraso-mobile-client/store/sync/PushDispatcher';

export const AppContent = () => {
  return (
    <>
      <RestrictByFlag flag="FF_offline">
        <OfflineSnackbar />
        <PushDispatcher />
        <PullRequester />
        <PullDispatcher />
      </RestrictByFlag>
      <RootNavigator />
    </>
  );
};
