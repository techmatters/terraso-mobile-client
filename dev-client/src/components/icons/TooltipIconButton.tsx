import React, {forwardRef} from 'react';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {IconName} from 'terraso-mobile-client/components/icons/Icon';

type TooltipIconButtonProps = {
  icon?: IconName;
  onPress: () => void;
};
const tooltipIconProps = {color: 'action.active_subtle', size: 'md'};
export const TooltipIconButton = forwardRef(
  ({icon: name = 'info', onPress}: TooltipIconButtonProps, ref) => (
    <IconButton
      ref={ref}
      _icon={tooltipIconProps}
      ml="6px"
      p="0"
      name={name}
      onPress={onPress}
    />
  ),
);
