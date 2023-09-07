import {HStack, Heading, Text, VStack} from 'native-base';
import {SearchInput} from '../components/common/SearchBar';
import {useTranslation} from 'react-i18next';
import {SiteDisplay} from '../types';
import {SITES_BY_PROJECT} from '../dataflow';
import {useCallback} from 'react';
import SelectAllCheckboxes from '../components/common/SelectAllCheckboxes';
import {Accordion} from '../components/common/Accordion';
import {useSelector} from '../model/store';
import {AppBar, ScreenScaffold} from './ScreenScaffold';

type ItemProps = {
  projectName: string;
  projectId: string;
  sites: Pick<SiteDisplay, 'name' | 'id'>[];
};

const SiteTransferItem = ({
  projectName,
  projectId: _projectId,
  sites,
}: ItemProps) => {
  const items = sites.map(site => ({
    value: String(site.id),
    label: site.name,
    key: String(site.id),
  }));
  const updateSelected = useCallback((currentItems: string[]) => {
    console.debug(currentItems);
  }, []);

  const head = (
    <HStack space={2} alignItems="center">
      <Heading>{projectName}</Heading>
      <Text>({items.length})</Text>
    </HStack>
  );
  return (
    <Accordion Head={head}>
      <SelectAllCheckboxes items={items} onUpdate={updateSelected} />
    </Accordion>
  );
};

type Props = {projectId: string};

export const SiteTransferProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();

  const project = useSelector(state => state.project.projects[projectId]);
  // TODO: Replace with data fetched from backend
  const sitesByProject = SITES_BY_PROJECT;

  return (
    <ScreenScaffold
      BottomNavigation={null}
      AppBar={<AppBar title={project.name} />}>
      <VStack space={4} p={4}>
        <Heading>{t('projects.transfer_sites.heading', '')}</Heading>
        <Text>{t('projects.transfer_sites.description', '')}</Text>
        <SearchInput />
        {Object.entries(sitesByProject)
          .filter(([aProjectId]) => aProjectId !== String(projectId))
          .map(([projId, {projectName, sites}]) => {
            return (
              <SiteTransferItem
                projectName={projectName}
                projectId={projId}
                sites={sites}
                key={projId}
              />
            );
          })}
      </VStack>
    </ScreenScaffold>
  );
};
