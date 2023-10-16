import {Select} from 'native-base';
import {useSelector} from 'terraso-mobile-client/model/store';
import {useMemo} from 'react';

type ProjectSelectProps = {
  projectId: string | undefined;
  setProjectId: (projectId: string | undefined) => void;
};
export const ProjectSelect = ({
  projectId,
  setProjectId,
}: ProjectSelectProps) => {
  const projects = useSelector(state => state.project.projects);
  const projectList = useMemo(() => Object.values(projects), [projects]);
  return (
    <Select selectedValue={projectId} onValueChange={setProjectId}>
      {projectList.map(project => (
        <Select.Item label={project.name} value={project.id} key={project.id} />
      ))}
    </Select>
  );
};
