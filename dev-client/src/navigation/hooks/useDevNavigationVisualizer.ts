// useDevNavigationVisualizer.ts
import type {NavigationContainerRefWithCurrent} from '@react-navigation/native';

/**
 * Dev-only wrapper around @bam.tech/react-navigation-visualizer-dev-plugin.
 * In production it does nothing and won't be bundled.
 */

export function useDevNavigationVisualizer(
  navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>,
) {
  if (__DEV__) {
    const {
      useReactNavigationDevTools,
    } = require('@bam.tech/react-navigation-visualizer-dev-plugin');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReactNavigationDevTools(navigationRef);
  }
}
