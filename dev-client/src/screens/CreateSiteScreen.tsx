import {useCallback} from 'react';
import CreateSiteView from '../components/sites/CreateSiteView';
import {useDispatch, useSelector} from '../model/store';
import {Site, addSite} from 'terraso-client-shared/site/siteSlice';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {ScreenDefinition} from './AppScaffold';
import CloseButton from '../components/common/CloseButton';

type Props =
  | {
      mapCoords?: Pick<Site, 'latitude' | 'longitude'>;
    }
  | undefined;

const CreateSiteScaffold = ({mapCoords}: Props = {}) => {
  const userLocation = useSelector(state => state.map.userLocation);
  const dispatch = useDispatch();

  const createSiteCallback = useCallback(
    (input: SiteAddMutationInput) => {
      dispatch(addSite(input));
    },
    [dispatch],
  );

  return (
    <CreateSiteView
      projects={[]}
      userLocation={userLocation}
      createSiteCallback={createSiteCallback}
      sitePin={mapCoords ? {coords: mapCoords} : undefined}
    />
  );
};

export const CreateSiteScreen: ScreenDefinition<Props> = {
  View: CreateSiteScaffold,
  options: () => ({headerLeft: CloseButton}),
};
