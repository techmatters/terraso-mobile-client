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
      if (openListener) openListener.remove();
      if (closeListener) closeListener.remove();
    };
  });

  return keyboardOpen;
};
