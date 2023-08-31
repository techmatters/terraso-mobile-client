import CreateProjectView from '../components/projects/CreateProjectView';
import {AppBar, ScreenCloseButton, ScreenScaffold} from './ScreenScaffold';

export const CreateProjectScreen = () => {
  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={<ScreenCloseButton />} />}>
      <CreateProjectView />
    </ScreenScaffold>
  );
};
