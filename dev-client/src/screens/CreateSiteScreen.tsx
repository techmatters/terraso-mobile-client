import {useCallback} from 'react';
import CreateSiteView from '../components/sites/CreateSiteView';
import {useDispatch, useSelector} from '../model/store';
import {
  Site,
  addSite,
  fetchSitesForProject,
} from 'terraso-client-shared/site/siteSlice';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {ScreenDefinition} from './AppScaffold';
import CloseButton from '../components/common/CloseButton';

type Props =
  | {
      mapCoords?: Pick<Site, 'latitude' | 'longitude'>;
    }
  | {
      projectId: string;
    };

const CreateSiteScaffold = (props: Props = {}) => {
  const userLocation = useSelector(state => state.map.userLocation);
  const projects = useSelector(state => state.project.projects);
  const dispatch = useDispatch();

  const createSiteCallback = useCallback(
    async (input: SiteAddMutationInput) => {
      await dispatch(addSite(input));
      if (input.projectId) {
        console.debug('dispatching');
        dispatch(fetchSitesForProject(input.projectId));
      }
    },
    [dispatch],
  );

  return (
    <CreateSiteView
      projects={Object.values(projects).map(({id, name, privacy}) => ({
        id,
        name,
        privacy,
      }))}
      userLocation={userLocation}
      createSiteCallback={createSiteCallback}
      defaultProject={('projectId' in props && props.projectId) || undefined}
      sitePin={
        'mapCoords' in props && props.mapCoords
          ? {coords: props.mapCoords}
          : undefined
      }
    />
  );
};

export const CreateSiteScreen: ScreenDefinition<Props> = {
  View: CreateSiteScaffold,
  options: () => ({headerLeft: CloseButton, headerBackVisible: false}),
};
