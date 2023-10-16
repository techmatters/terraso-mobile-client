import {Box, HStack} from 'native-base';
import {ReactNode, useCallback, useState} from 'react';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  Head: ReactNode;
  children: ReactNode;
  initiallyOpen?: boolean;
};

export function Accordion({Head, children, initiallyOpen = false}: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const onPress = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const name = open ? 'expand-less' : 'expand-more';
  return (
    <Box>
      <HStack
        backgroundColor="primary.main"
        alignItems="center"
        justifyContent="space-between"
        px="16px">
        {Head}
        <IconButton
          name={name}
          onPress={onPress}
          _icon={{color: 'primary.contrast'}}
        />
      </HStack>
      {open && children}
    </Box>
  );
}
