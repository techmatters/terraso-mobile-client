/*
 * Copyright © 2026 Technology Matters
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

import {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {useReducedMotion} from 'react-native-reanimated';

import {useIsFocused} from '@react-navigation/native';
import {LottieViewProps} from 'lottie-react-native';

import {AnimatedIcon} from 'terraso-mobile-client/components/AnimatedIcon';
import {CarouselButton} from 'terraso-mobile-client/components/buttons/CarouselButton';
import {
  CarouselPage,
  CarouselZoneHeight,
} from 'terraso-mobile-client/components/Carousel';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

const VIEWED_KEY_PREFIX = 'tutorial.viewedVersion.';

/* Enough to catch the eye on arrival without becoming ambient motion the user has to sit with. */
const CYCLES_PER_VISIT = 3;

export type TutorialCarouselButtonProps = {
  /* Namespaces the viewed record; opening one tutorial must not silence the others. */
  tutorialKey: string;
  /* Bump when the carousel gains content worth re-advertising, which re-arms the animation for users who already viewed an older version. Deliberately manual rather than a content hash: `pages` holds JSX, which has no stable serialization, and a typo fix should not re-nag everyone. */
  contentVersion: number;
  label: string;
  animation: LottieViewProps['source'];
  pages: CarouselPage[];
  aboveHeight: CarouselZoneHeight;
  sheetHeading?: React.ReactNode;
  iconSize?: number;
};

/*
 * Carousel button paired with an animated icon that draws attention until the
 * user has opened the carousel at its current contentVersion. The record is
 * local-only (see kvStorage): it is a UI hint rather than user data, so a
 * reinstall replaying the animation is an acceptable trade for working offline
 * with no backend surface.
 */
export const TutorialCarouselButton = ({
  tutorialKey,
  contentVersion,
  label,
  animation,
  pages,
  aboveHeight,
  sheetHeading,
  iconSize,
}: TutorialCarouselButtonProps) => {
  const [viewedVersion, setViewedVersion] = kvStorage.useNumber(
    VIEWED_KEY_PREFIX + tutorialKey,
    0,
  );
  const reducedMotion = useReducedMotion();
  const isFocused = useIsFocused();

  /* `>=` so rolling a version back does not re-nag users who already saw the newer content. */
  const viewed = viewedVersion >= contentVersion;

  const onPress = useCallback(
    () => setViewedVersion(contentVersion),
    [setViewedVersion, contentVersion],
  );

  return (
    <View style={styles.row}>
      <CarouselButton
        label={label}
        pages={pages}
        aboveHeight={aboveHeight}
        sheetHeading={sheetHeading}
        onPress={onPress}
      />
      <AnimatedIcon
        source={animation}
        /* Re-arming on focus is what restarts the cycle count on each visit to the screen. */
        playing={isFocused && !viewed && !reducedMotion}
        maxCycles={CYCLES_PER_VISIT}
        size={iconSize}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
});
