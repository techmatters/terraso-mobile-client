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

import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';

import {LottieViewProps} from 'lottie-react-native';

import {AnimatedIcon} from 'terraso-mobile-client/components/AnimatedIcon';
import {PillButton} from 'terraso-mobile-client/components/buttons/PillButton';
import {CarouselPage} from 'terraso-mobile-client/components/Carousel';
import {CarouselSheet} from 'terraso-mobile-client/components/sheets/CarouselSheet';
import {
  CYCLES_PER_VISIT,
  useNudgeWhileUnseen,
} from 'terraso-mobile-client/hooks/useNudgeWhileUnseen';
import {useSeenOnce} from 'terraso-mobile-client/hooks/useSeenOnce';

/* Scopes the seen record to overviews, leaving overviewKey to distinguish them from each other. */
const SEEN_KEY_NAMESPACE = 'overview.';

export type OverviewCarouselButtonProps = {
  /* Namespaces the seen record; opening one overview must not silence the others. */
  overviewKey: string;
  /* Bump when the carousel gains content worth re-advertising, which re-arms the animation for users who already viewed an older version. Deliberately manual rather than a content hash: `pages` holds JSX, which has no stable serialization, and a typo fix should not re-nag everyone. */
  contentVersion: number;
  animation: LottieViewProps['source'];
  pages: CarouselPage[];
};

/*
 * Pill trigger that opens a carousel overview, paired with an animated icon that draws
 * attention until the user has opened it at its current contentVersion. The label doubles
 * as the accessibility name, so unlike an image trigger there is nothing extra for callers
 * to supply.
 *
 * Marking the overview seen on press (rather than on dismiss, or on reaching the last page)
 * is this component's choice: the animation advertises that the overview exists, and opening
 * it at all is enough to have delivered that.
 */
export const CarouselButtonWithAnimation = ({
  overviewKey,
  contentVersion,
  animation,
  pages,
}: OverviewCarouselButtonProps) => {
  const {t} = useTranslation();
  const {seen, markSeen} = useSeenOnce(
    SEEN_KEY_NAMESPACE + overviewKey,
    contentVersion,
  );
  const nudging = useNudgeWhileUnseen(seen);

  return (
    <View style={styles.row}>
      <CarouselSheet
        pages={pages}
        trigger={onOpen => (
          <PillButton
            label={t('general.carousel.overview')}
            onPress={() => {
              markSeen();
              onOpen();
            }}
          />
        )}
      />
      <AnimatedIcon
        source={animation}
        playing={nudging}
        maxCycles={CYCLES_PER_VISIT}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
});
