import {useSelector} from 'terraso-mobile-client/model/store';
import {
  AppBar,
  ScreenCloseButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';

type Props = {
  projectId: string;
  userId: string;
  membershipId: string;
};

export const ManageTeamMemberScreen = ({projectId, userId}: Props) => {
  const project = useSelector(state => state.project.projects[projectId]);
  return (
    <ScreenScaffold
      AppBar={
        <AppBar title={project?.name} LeftButton={<ScreenCloseButton />} />
      }>
      <></>
    </ScreenScaffold>
  );
};
