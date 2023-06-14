import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {HStack, Heading, Text, VStack} from 'native-base';
import {SearchInput} from '../components/common/SearchBar';
import {useTranslation} from 'react-i18next';
import {SiteDisplay} from '../types';
import {SITES_BY_PROJECT} from '../dataflow';
import {useCallback} from 'react';
import SelectAllCheckboxes from '../components/common/SelectAllCheckboxes';
import {Accordion} from '../components/common/Accordion';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.SITE_TRANSFER_PROJECT
>;

type ItemProps = {
  projectName: string;
  projectId: string;
  sites: Pick<SiteDisplay, 'name' | 'id'>[];
};

function SiteTransferItem({projectName, projectId, sites}: ItemProps) {
  const items = sites.map(site => ({
    value: String(site.id),
    label: site.name,
    key: String(site.id),
  }));
  const updateSelected = useCallback((items: string[]) => {
    console.debug(items);
  }, []);

  const head = (
    <HStack space={2} alignItems="center">
      <Heading>{projectName}</Heading>
      <Text>({items.length})</Text>
    </HStack>
  );
  const body = <SelectAllCheckboxes items={items} onUpdate={updateSelected} />;
  return <Accordion Head={head} Body={body} />;
}

export default function SiteTransferProject({
  route: {
    params: {projectId},
  },
}: Props) {
  const {t} = useTranslation();

  // TODO: Replace with data fetched from backend
  const sitesByProject = SITES_BY_PROJECT;

  return (
    <VStack space={4} p={4}>
      <Heading>{t('projects.transfer_sites.heading', '')}</Heading>
      <Text>{t('projects.transfer_sites.description', '')}</Text>
      <SearchInput />
      {Object.entries(sitesByProject)
        .filter(([aProjectId]) => aProjectId !== String(projectId))
        .map(([projectId, {projectName, sites}]) => {
          return (
            <SiteTransferItem
              projectName={projectName}
              projectId={projectId}
              sites={sites}
              key={projectId}
            />
          );
        })}
    </VStack>
  );
}
