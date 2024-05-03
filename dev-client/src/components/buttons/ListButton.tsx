import {Button} from 'native-base';
import {useMemo} from 'react';
import {PressableProps} from 'react-native-paper/lib/typescript/components/TouchableRipple/Pressable';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';

export type ListButtonType = 'default' | 'error';

export type ListButtonProps = Pick<PressableProps, 'onPress'> & {
  type: ListButtonType;
  labelText: string;
  iconName: IconName;
};

export function ListButton({
  type = 'default',
  iconName,
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
      leftIcon={iconName ? <Icon name={iconName} color={color} /> : undefined}
      _pressed={{backgroundColor: pressedColor}}
      onPress={onPress}>
      {labelText}
    </Button>
  );
}
