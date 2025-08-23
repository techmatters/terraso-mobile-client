// TabJumpEffect.tsx
import {useCallback} from 'react';

import {
  TabActions,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import {useSiteTabJumpContext} from 'terraso-mobile-client/navigation/components/SiteTabJumpProvider';

export function SiteTabJump() {
  const nav = useNavigation();
  const {nextSiteTab, setNextSiteTab} = useSiteTabJumpContext();

  useFocusEffect(
    useCallback(() => {
      if (!nextSiteTab) return;

      const state = nav.getState();
      const names = state?.routes?.map(r => r.name) ?? [];
      if (
        state &&
        names.includes(nextSiteTab) &&
        state.routes[state.index].name !== nextSiteTab
      ) {
        nav.dispatch(TabActions.jumpTo(nextSiteTab));
      }
      setNextSiteTab(null);
    }, [nextSiteTab, nav, setNextSiteTab]),
  );

  return null;
}
