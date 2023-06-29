import {Box, HStack} from 'native-base';
import {ReactNode, useCallback, useState} from 'react';
import MaterialIconButton from './MaterialIconButton';

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
    <MaterialIconButton
      name={name}
      onPress={onPress}
      iconProps={{color: 'action.active'}}
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
