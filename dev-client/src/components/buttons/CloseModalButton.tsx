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

import {StyleSheet, View} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {useModal} from 'terraso-mobile-client/components/modals/Modal';

export type CloseModalButtonProps = {
  label: string;
};

/* Labeled button that dismisses the modal or sheet it is rendered in. */
export const CloseModalButton = ({label}: CloseModalButtonProps) => {
  const modalHandle = useModal();

  /* Don't render when we're outside a modal and there's nothing to dismiss */
  return modalHandle ? (
    <View style={styles.container}>
      <ContainedButton label={label} onPress={modalHandle.onClose} />
    </View>
  ) : null;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
