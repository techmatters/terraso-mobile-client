import {
  IconButton,
  IconButtonProps,
} from 'terraso-mobile-client/components/common/Icons';

export const BottomNavIconButton = (
  props: IconButtonProps & {label: string},
) => <IconButton pb={0} _icon={{color: 'primary.contrast'}} {...props} />;
