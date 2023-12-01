import {
  IconButton,
  IconButtonProps,
} from 'terraso-mobile-client/components/Icons';

export const AppBarIconButton = (props: IconButtonProps) => (
  <IconButton size="md" _icon={{color: 'primary.contrast'}} {...props} />
);
