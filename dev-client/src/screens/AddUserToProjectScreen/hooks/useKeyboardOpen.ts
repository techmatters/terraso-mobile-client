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

import {useEffect, useState} from 'react';
import {Keyboard} from 'react-native';

export const useKeyboardOpen = () => {
  const [keyboardOpen, setKeyboardOpen] = useState<boolean>(
    Keyboard.isVisible(),
  );

  useEffect(() => {
    const openListener = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardOpen(true),
    );
    const closeListener = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardOpen(false),
    );
    return () => {
      openListener.remove();
      closeListener.remove();
    };
  }, []);

  return keyboardOpen;
};
