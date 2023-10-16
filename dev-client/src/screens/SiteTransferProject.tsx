import {HStack, Heading, Text, VStack} from 'native-base';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {useTranslation} from 'react-i18next';
import {useCallback, useMemo} from 'react';
import SelectAllCheckboxes from 'terraso-mobile-client/components/common/SelectAllCheckboxes';
import {Accordion} from 'terraso-mobile-client/components/common/Accordion';
import {useSelector} from 'terraso-mobile-client/model/store';
import {
  AppBar,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useTextSearch} from 'terraso-mobile-client/components/common/search/search';
import {Site} from 'terraso-client-shared/site/siteSlice';

type ItemProps = {
  projectName: string;
  sites: Site[];
};

const SiteTransferItem = ({projectName, sites}: ItemProps) => {
  const items = sites.map(site => ({
    value: site.id,
    label: site.name,
    key: site.id,
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

  const projects = useSelector(state => state.project.projects);
  const project = projects[projectId];
  const sites = useSelector(state => state.site.sites);
  const siteList = useMemo(() => Object.values(sites), [sites]);
  const {
    results: searchedSites,
    query,
    setQuery,
  } = useTextSearch({data: siteList, keys: ['name']});

  const sortedSitesByProject = useMemo(() => {
    const nonProjectSites = searchedSites.filter(
      site => site.projectId === undefined,
    );
    const projectSites = searchedSites.filter(
      site => site.projectId !== undefined && site.projectId !== project.id,
    );

    const sitesByProject = projectSites.reduce(
      (projectMap, site) =>
        Object.assign(projectMap, {
          [site.projectId!]: {...projectMap[site.projectId!], [site.id]: site},
        }),
      {} as Record<string, Record<string, Site>>,
    );

    return [
      [undefined, nonProjectSites] as const,
      ...Object.entries(sitesByProject)
        .sort(([projectIdA], [projectIdB]) =>
          projects[projectIdA].name.localeCompare(projects[projectIdB].name),
        )
        .map(
          ([projIds, projSites]) =>
            [projects[projIds], Object.values(projSites)] as const,
        ),
    ].map(
      ([pId, projSites]) =>
        [
          pId,
          projSites.sort((siteA, siteB) =>
            siteA.name.localeCompare(siteB.name),
          ),
        ] as const,
    );
  }, [projects, project.id, searchedSites]);

  return (
    <ScreenScaffold
      BottomNavigation={null}
      AppBar={<AppBar title={project.name} />}>
      <VStack space={4} p={4}>
        <Heading>{t('projects.transfer_sites.heading', '')}</Heading>
        <Text>{t('projects.transfer_sites.description', '')}</Text>
        <SearchBar
          query={query}
          setQuery={setQuery}
          placeholder={t('site.search.placeholder')}
        />
        {sortedSitesByProject.map(([itemProject, itemSites]) => {
          return (
            <SiteTransferItem
              projectName={
                itemProject?.name ?? t('projects.transfer_sites.unaffiliated')
              }
              sites={itemSites}
              key={itemProject?.id ?? null}
            />
          );
        })}
      </VStack>
    </ScreenScaffold>
  );
};
