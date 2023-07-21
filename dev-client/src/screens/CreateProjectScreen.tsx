import CreateProjectView from '../components/projects/CreateProjectView';
import CloseButton from '../components/common/CloseButton';
import {ScreenDefinition} from './AppScaffold';

export const CreateProjectScreen: ScreenDefinition = {
  View: CreateProjectView,
  options: () => ({headerLeft: CloseButton}),
};
