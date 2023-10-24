import {HStack, Heading, Text, VStack} from 'native-base';
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
import {groupBy} from 'terraso-mobile-client/util';
import {useEffect, useMemo} from 'react';

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
      const key = [site.projectId, site.projectName];
      let current = null;
      if (!clusters.has(key)) {
        current = [];
      } else {
        current = clusters.get(key);
      }
      current.push(site);
      clusters.set(key, current);
    }
    return Array.from(clusters) as [
      [string, string],
      (typeof searchedSites)[number][],
    ][];
  }, [searchedSites]);

  useEffect(() => console.debug(groupedByProject), [groupedByProject]);

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
        {groupedByProject.map(([[projectId, projectName], cluster]) => (
          <Accordion
            key={projectId}
            Head={
              <Text>
                {projectName} {cluster.length}
              </Text>
            }>
            <Text>World</Text>
          </Accordion>
        ))}
      </VStack>
    </ScreenScaffold>
  );
};
