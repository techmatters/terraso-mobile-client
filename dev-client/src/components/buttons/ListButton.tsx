import {IconProps, Icon} from 'terraso-mobile-client/components/Icons';
import {Button} from 'native-base';
import {useMemo} from 'react';
import {PressableProps} from 'react-native-paper/lib/typescript/components/TouchableRipple/Pressable';

export type ListButtonType = 'default' | 'error';

export type ListButtonProps = Pick<IconProps, 'name'> &
  Pick<PressableProps, 'onPress'> & {
    type: ListButtonType;
    labelText: string;
  };

export function ListButton({
  type = 'default',
  name,
  labelText,
  onPress,
}: ListButtonProps) {
  const {color, pressedColor} = useMemo(() => {
    switch (type) {
      case 'error':
        return {color: 'error.main', pressedColor: 'red.100'};
      default:
        return {color: 'text.primary', pressedColor: undefined};
    }
  }, [type]);

  return (
    <Button
      size="md"
      variant="ghost"
      alignSelf="flex-start"
      _text={{color: color, textTransform: 'uppercase'}}
      leftIcon={name ? <Icon name={name} color={color} /> : undefined}
      _pressed={{backgroundColor: pressedColor}}
      onPress={onPress}>
      {labelText}
    </Button>
  );
}
