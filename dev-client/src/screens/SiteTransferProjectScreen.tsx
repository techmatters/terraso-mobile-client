import {Fab, FlatList, Heading, Text, VStack} from 'native-base';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {Accordion} from 'terraso-mobile-client/components/common/Accordion';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {
  AppBar,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useTextSearch} from 'terraso-mobile-client/components/common/search/search';
import {selectProjectsWithTransferrableSites} from 'terraso-client-shared/selectors';
import {useTranslation} from 'react-i18next';
import {useCallback, useEffect, useMemo, useState} from 'react';
import CheckboxGroup from 'terraso-mobile-client/components/common/CheckboxGroup';
import {transferSites} from 'terraso-client-shared/site/siteSlice';

type Props = {projectId: string};

export const SiteTransferProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const project = useSelector(state => state.project.projects[projectId]);
  const {projects, sites} = useSelector(state =>
    selectProjectsWithTransferrableSites(state, 'manager'),
  );
  const sitesExcludingCurrent = useMemo(() => {
    return sites.filter(site => site.projectId !== projectId);
  }, [sites, projectId]);

  const projectsExcludingCurrent = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let {[projectId]: _, ...rest} = projects;
    return rest;
  }, [projects, projectId]);

  const {
    results: searchedSites,
    query,
    setQuery,
  } = useTextSearch({data: sitesExcludingCurrent, keys: ['siteName']});

  const displayedProjects = useMemo(() => {
    const displayed: Record<
      string,
      {projectName: string; sites: typeof searchedSites}
    > = {};
    for (let site of searchedSites) {
      if (!(site.projectId in displayed)) {
        displayed[site.projectId] = {
          projectName: site.projectName,
          sites: [],
        };
      }
      displayed[site.projectId].sites.push(site);
    }
    if (!query) {
      // want to display empty projects if not query!
      for (const {projectId: projId, projectName} of Object.values(
        projectsExcludingCurrent,
      )) {
        if (!(projId in displayed)) {
          displayed[projId] = {projectName, sites: []};
        }
      }
    }
    return displayed;
  }, [projectsExcludingCurrent, searchedSites, query]);

  const listData = useMemo(
    () =>
      Object.entries(displayedProjects).sort((a, b) =>
        a[1].projectName.localeCompare(b[1].projectName),
      ),
    [displayedProjects],
  );

  const projectRecord = useMemo(() => {
    const record: Record<string, Record<string, boolean>> = {};
    for (const site of sitesExcludingCurrent) {
      if (!(site.projectId in record)) {
        record[site.projectId] = {};
      }
      record[site.projectId][site.siteId] = false;
    }
    return record;
  }, [sitesExcludingCurrent]);

  const [projState, setProjState] = useState<typeof projectRecord>({});

  const removeKeys = (a: any, b: any) => {
    const remove = [a, b];
    let currA, currB;
    while (remove.length) {
      currA = remove.pop();
      currB = remove.pop();
      for (const keyA of Object.keys(currA)) {
        if (!(keyA in currB)) {
          delete currA[keyA];
          continue;
        }
        const valA = currA[keyA];
        const valB = currB[keyA];
        if (typeof valA !== typeof valB) {
          delete currA[keyA];
          continue;
        }
        if (typeof valA === 'object' && !Array.isArray(valA) && valA !== null) {
          remove.push(valA, valB);
        }
      }
    }
  };

  useEffect(() => {
    setProjState(latestState => {
      const newState = Object.assign({...latestState}, projectRecord);
      removeKeys(newState, projectRecord);
      return newState;
    });
  }, [projectRecord, setProjState]);

  const onCheckboxChange = useCallback(
    (groupId: string, checkboxId: string) => (checked: boolean) => {
      setProjState(currState => {
        const newState = {...currState};
        newState[groupId][checkboxId] = checked;
        return newState;
      });
    },
    [setProjState],
  );

  const onSubmit = useCallback(() => {
    const siteIds = Object.values(projState).flatMap(projSites =>
      Object.entries(projSites)
        .filter(([_, checked]) => checked)
        .map(([siteId, _]) => siteId),
    );
    const payload = {projectId, siteIds};
    return dispatch(transferSites(payload));
  }, [projState]);

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
        <FlatList
          data={listData}
          renderItem={({
            item: [projId, {projectName, sites: projectSites}],
          }) => (
            <Accordion
              key={projId}
              Head={
                <Text>
                  {projectName} - {projectSites.length}
                </Text>
              }
              disableOpen={projectSites.length === 0}>
              {projectSites.length > 0 ? (
                <CheckboxGroup
                  groupName={projectName}
                  groupId={projId}
                  checkboxes={projectSites
                    .map(({siteId, siteName}) => ({
                      label: siteName,
                      id: siteId,
                      checked:
                        projState && projState[projId]
                          ? projState[projId][siteId]
                          : false,
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label))}
                  onChangeValue={onCheckboxChange}
                />
              ) : undefined}
            </Accordion>
          )}
        />
      </VStack>
      <Fab
        label={
          <Text textTransform="uppercase" color="primary.contrast">
            Transfer sites
          </Text>
        }
        onPress={onSubmit}
      />
    </ScreenScaffold>
  );
};
