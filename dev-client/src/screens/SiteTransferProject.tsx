import {Heading, Text, VStack} from 'native-base';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {Accordion} from 'terraso-mobile-client/components/common/Accordion';
import {useSelector} from 'terraso-mobile-client/model/store';
import {
  AppBar,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useTextSearch} from 'terraso-mobile-client/components/common/search/search';
import {selectProjectsWithTransferrableSites} from 'terraso-client-shared/selectors';
import {useTranslation} from 'react-i18next';
import {useEffect, useMemo} from 'react';
import CheckboxGroup, {
  useCheckboxHandlers,
} from 'terraso-mobile-client/components/common/CheckboxGroup';

type Props = {projectId: string};

export const SiteTransferProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();

  const projects = useSelector(state => state.project.projects);
  const project = projects[projectId];
  const sites = useSelector(state =>
    selectProjectsWithTransferrableSites(state, 'manager'),
  );

  const {
    results: searchedSites,
    query,
    setQuery,
  } = useTextSearch({data: sites, keys: ['siteName']});

  const groupedByProject = useMemo(() => {
    const clusters = new Map();
    for (const site of searchedSites) {
      const key = projectId;
      let current = null;
      if (!clusters.has(key)) {
        current = [];
      } else {
        current = clusters.get(key);
      }
      current.push(site);
      clusters.set(key, current);
    }
    return Object.fromEntries(clusters) as Record<
      string,
      (typeof searchedSites)[number][]
    >;
  }, [searchedSites]);

  const checkboxHandlers = useCheckboxHandlers(
    Object.entries(groupedByProject).reduce(
      (x, [projectId, fields]) => ({
        ...x,
        [projectId]: fields.length,
      }),
      {},
    ),
  );

  // useEffect(() => console.debug(groupedByProject));

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
        {Object.entries(groupedByProject).map(
          ([projectId, cluster]) =>
            cluster &&
            cluster.length && (
              <Accordion
                key={projectId}
                Head={
                  <Text>
                    {cluster[0].projectName} {cluster.length}
                  </Text>
                }>
                <CheckboxGroup
                  checkboxes={cluster.map((site, i) => ({
                    label: site.siteName,
                    id: site.siteId,
                    onValue: checkboxHandlers.onValueChanged(site.projectId, i),
                    checked: checkboxHandlers.checkedValues[site.projectId][i],
                  }))}
                  allChecked={checkboxHandlers.allChecked[projectId]}
                  onCheckAll={checkboxHandlers.onAllChecked(projectId)}
                  groupName={projectId}
                />
              </Accordion>
            ),
        )}
      </VStack>
    </ScreenScaffold>
  );
};
