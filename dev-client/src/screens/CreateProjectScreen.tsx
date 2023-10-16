import CreateProjectView from 'terraso-mobile-client/components/projects/CreateProjectView';
import {
  AppBar,
  ScreenCloseButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';

export const CreateProjectScreen = () => {
  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={<ScreenCloseButton />} />}>
      <CreateProjectView />
    </ScreenScaffold>
  );
};
