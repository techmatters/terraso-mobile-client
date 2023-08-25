import {useCallback} from 'react';
import CreateSiteView from '../components/sites/CreateSiteView';
import {useDispatch, useSelector} from '../model/store';
import {
  addSite,
  fetchSitesForProject,
} from 'terraso-client-shared/site/siteSlice';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {ScreenDefinition} from './AppScaffold';
import CloseButton from '../components/common/CloseButton';
import {Coords} from '../model/map/mapSlice';

type Props =
  | {
      coords: Coords;
    }
  | {
      projectId: string;
    }
  | {}
  | undefined;

const CreateSiteScaffold = (props: Props = {}) => {
  const userLocation = useSelector(state => state.map.userLocation);
  const dispatch = useDispatch();

  const createSiteCallback = useCallback(
    async (input: SiteAddMutationInput) => {
      await dispatch(addSite(input));
      if (input.projectId) {
        dispatch(fetchSitesForProject(input.projectId));
      }
    },
    [dispatch],
  );

  return (
    <CreateSiteView
      userLocation={userLocation}
      createSiteCallback={createSiteCallback}
      defaultProject={'projectId' in props ? props.projectId : undefined}
      sitePin={'coords' in props ? props.coords : undefined}
    />
  );
};

export const CreateSiteScreen: ScreenDefinition<Props> = {
  View: CreateSiteScaffold,
  options: () => ({headerLeft: CloseButton, headerBackVisible: false}),
};
