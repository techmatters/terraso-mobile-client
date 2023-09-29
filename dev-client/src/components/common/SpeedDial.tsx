import {useState, useCallback} from 'react';
import {Column} from 'native-base';
import {IconButton} from './Icons';

export const SpeedDialButton = (
  props: React.ComponentProps<typeof IconButton>,
) => <IconButton variant="FAB" {...props} />;

export const SpeedDial = ({children}: React.PropsWithChildren<{}>) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleIsOpen = useCallback(() => setIsOpen(value => !value), []);

  return (
    <Column
      alignItems="flex-end"
      position="absolute"
      right="16px"
      bottom="16px"
      space="16px">
      {isOpen && children}
      <IconButton
        variant="FAB"
        name={isOpen ? 'close' : 'add'}
        onPress={toggleIsOpen}
      />
    </Column>
  );
};
