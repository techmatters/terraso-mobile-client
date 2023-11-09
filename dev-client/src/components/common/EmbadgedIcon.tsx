import {Badge, Pressable} from 'native-base';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  _badge?: {} & Omit<React.ComponentProps<typeof Badge>, 'variant'>;
  _iconButton?: {} & Omit<
    React.ComponentProps<typeof IconButton>,
    'onPress' | 'name' | 'accessibilityLabel'
  >;
  badgeNum: number;
  iconName: string;
  accessibilityLabel?: string;
} & React.ComponentProps<typeof Pressable>;

const EmbadgedIcon = ({
  badgeNum,
  iconName,
  onPress,
  _badge = {},
  _iconButton = {},
  accessibilityLabel,
  ...pressableProps
}: Props) => {
  return (
    <Pressable {...pressableProps}>
      {badgeNum > 0 && (
        <Badge variant="notification" {..._badge}>
          {badgeNum}
        </Badge>
      )}
      <IconButton
        name={iconName}
        {..._iconButton}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      />
    </Pressable>
  );
};

export default EmbadgedIcon;
