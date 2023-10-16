import {useCallback} from 'react';
import {CreateSiteView} from 'terraso-mobile-client/components/sites/CreateSiteView';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {
  addSite,
  fetchSitesForProject,
} from 'terraso-client-shared/site/siteSlice';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {
  AppBar,
  ScreenCloseButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';

type Props =
  | {
      coords: Coords;
    }
  | {
      projectId: string;
    }
  | {}
  | undefined;

export const CreateSiteScreen = (props: Props = {}) => {
  const dispatch = useDispatch();

  const createSiteCallback = useCallback(
    async (input: SiteAddMutationInput) => {
      let result = await dispatch(addSite(input));
      if (result.payload && 'error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
        return;
      }
      if (input.projectId) {
        dispatch(fetchSitesForProject(input.projectId));
      }
      return result.payload;
    },
    [dispatch],
  );

  return (
    <ScreenScaffold
      BottomNavigation={null}
      AppBar={<AppBar LeftButton={<ScreenCloseButton />} />}>
      <CreateSiteView
        createSiteCallback={createSiteCallback}
        defaultProjectId={'projectId' in props ? props.projectId : undefined}
        sitePin={'coords' in props ? props.coords : undefined}
      />
    </ScreenScaffold>
  );
};
