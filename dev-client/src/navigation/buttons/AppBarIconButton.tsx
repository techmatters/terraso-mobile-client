import {
  IconButton,
  IconButtonProps,
} from 'terraso-mobile-client/components/common/Icons';

export const AppBarIconButton = (props: IconButtonProps) => (
  <IconButton size="md" _icon={{color: 'primary.contrast'}} {...props} />
);
