/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {Box, Fab, FlatList, Text} from 'native-base';
import {Accordion} from 'terraso-mobile-client/components/Accordion';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {useTextSearch} from 'terraso-mobile-client/hooks/useTextSearch';
import {selectProjectsWithTransferrableSites} from 'terraso-client-shared/selectors';
import {useTranslation} from 'react-i18next';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {CheckboxGroup} from 'terraso-mobile-client/screens/SiteTransferProjectScreen/components/CheckboxGroup';
import {transferSites} from 'terraso-client-shared/site/siteSlice';
import {removeKeys} from 'terraso-mobile-client/util';
import {ListHeader} from 'terraso-mobile-client/screens/SiteTransferProjectScreen/components/ListHeader';
import {
  RootNavigatorScreenProps,
  RootNavigatorScreens,
} from 'terraso-mobile-client/navigation/types';

const UNAFFILIATED = {
  projectId: Symbol('unaffiliated'),
  projectName: '',
};

type Props =
  RootNavigatorScreenProps<RootNavigatorScreens.SITE_TRANSFER_PROJECT>;

export const SiteTransferProjectScreen = ({route, navigation}: Props) => {
  const {projectId} = route.params;

  const {t} = useTranslation();
  const dispatch = useDispatch();

  UNAFFILIATED.projectName = t('projects.transfer_sites.unaffiliated');

  const hasUnaffiliatedProject = (o: object) =>
    Object.getOwnPropertySymbols(o).find(
      symb => symb === UNAFFILIATED.projectId,
    ) !== undefined;

  const {projects, sites, unaffiliatedSites} = useSelector(state =>
    selectProjectsWithTransferrableSites(state, 'manager'),
  );
  const sitesExcludingCurrent = useMemo(() => {
    const prospectiveSites = sites.filter(site => site.projectId !== projectId);
    const unaffiliated = unaffiliatedSites.map(site => ({
      ...site,
      projectId: UNAFFILIATED.projectId,
      projectName: UNAFFILIATED.projectName,
    }));
    return [...prospectiveSites, ...unaffiliated];
  }, [sites, projectId, unaffiliatedSites]);

  const projectsExcludingCurrent: Record<
    string | symbol,
    {projectId: string | symbol; projectName: string}
  > = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let {[projectId]: _, ...rest} = projects;
    return {...rest, [UNAFFILIATED.projectId]: UNAFFILIATED};
  }, [projects, projectId]);

  const {
    results: searchedSites,
    query,
    setQuery,
  } = useTextSearch({data: sitesExcludingCurrent, keys: ['siteName']});

  const displayedProjects = useMemo(() => {
    const displayed: Record<
      string | symbol,
      {
        projectName: string;
        projId: string | symbol;
        sites: typeof searchedSites;
      }
    > = {};
    for (let site of searchedSites) {
      if (!(site.projectId in displayed)) {
        displayed[site.projectId] = {
          projectName: site.projectName,
          projId: site.projectId,
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
          displayed[projId] = {projectName, projId, sites: []};
        }
      }
    }
    return displayed;
  }, [projectsExcludingCurrent, searchedSites, query]);

  const listData = useMemo(() => {
    let pool: [string | symbol, (typeof displayedProjects)[string]][] =
      Object.entries(displayedProjects);
    if (hasUnaffiliatedProject(displayedProjects)) {
      pool.push([
        UNAFFILIATED.projectId,
        displayedProjects[UNAFFILIATED.projectId],
      ]);
    }
    const sortedProjects = pool.sort((a, b) => {
      if (a[1].projId === UNAFFILIATED.projectId) {
        return -1;
      }
      return a[1].projectName.localeCompare(b[1].projectName);
    });
    return sortedProjects;
  }, [displayedProjects]);

  const projectRecord = useMemo(() => {
    const record: Record<string | symbol, Record<string, boolean>> = {};
    for (const site of sitesExcludingCurrent) {
      if (
        !(site.projectId in record) ||
        (site.projectId === UNAFFILIATED.projectId &&
          !hasUnaffiliatedProject(record))
      ) {
        record[site.projectId] = {};
      }
      record[site.projectId][site.siteId] = false;
    }
    return record;
  }, [sitesExcludingCurrent]);

  const [projState, setProjState] = useState<typeof projectRecord>({});

  useEffect(() => {
    setProjState(latestState => {
      const newState = Object.assign({...latestState}, projectRecord);
      removeKeys(newState, projectRecord);
      return newState;
    });
  }, [projectRecord, setProjState]);

  const onCheckboxChange = useCallback(
    (groupId: string | symbol, checkboxId: string) => (checked: boolean) => {
      setProjState(currState => {
        const newState = {...currState};
        newState[groupId][checkboxId] = checked;
        return newState;
      });
    },
    [setProjState],
  );

  const checkedSites = useMemo(() => {
    const pool = Object.values(projState);
    if (hasUnaffiliatedProject(projState)) {
      pool.push(projState[UNAFFILIATED.projectId]);
    }
    return pool.flatMap(projSites =>
      Object.entries(projSites)
        .filter(([_, checked]) => checked)
        .map(([siteId, _]) => siteId),
    );
  }, [projState]);

  const disabled = useMemo(() => checkedSites.length === 0, [checkedSites]);

  const onSubmit = useCallback(async () => {
    const payload = {projectId, siteIds: checkedSites};
    await dispatch(transferSites(payload));
    return navigation.pop();
  }, [dispatch, navigation, projectId, checkedSites]);

  return (
    <>
      <ListHeader query={query} setQuery={setQuery} />
      <FlatList
        data={listData}
        keyExtractor={([projId, _]) => String(projId)}
        renderItem={({item: [projId, {projectName, sites: projectSites}]}) => (
          <Accordion
            Head={
              <Text
                variant="body1"
                fontWeight={700}
                color="primary.contrast"
                py="14px">
                {projectName} ({projectSites.length})
              </Text>
            }
            initiallyOpen={projectSites.length > 0}
            disableOpen={projectSites.length === 0}>
            {projectSites.length > 0 ? (
              <Box px="15px" my="15px">
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
              </Box>
            ) : undefined}
          </Accordion>
        )}
      />
      <Fab
        label={
          <Text textTransform="uppercase" color="primary.contrast">
            Transfer sites
          </Text>
        }
        onPress={onSubmit}
        disabled={disabled}
        bgColor={disabled ? 'action.disabledBackground' : undefined}
        color={disabled ? 'action.disabled' : undefined}
      />
    </>
  );
};
