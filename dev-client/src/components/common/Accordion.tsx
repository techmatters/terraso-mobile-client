import {Box, HStack} from 'native-base';
import {ReactNode, useCallback, useState} from 'react';
import {IconButton} from './Icons';

type Props = {
  Head: ReactNode;
  Body: ReactNode;
};

export function Accordion({Head, Body}: Props) {
  const [open, setOpen] = useState(false);
  const onPress = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const name = open ? 'expand-less' : 'expand-more';
  const icon = (
    <IconButton
      name={name}
      onPress={onPress}
      _icon={{color: 'action.active'}}
    />
  );
  return (
    <Box>
      <HStack>
        <Box>{Head}</Box>
        {icon}
      </HStack>
      {open && <Box ml={3}>{Body}</Box>}
    </Box>
  );
}
