import {View} from 'react-native';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';

export const LinkNewWindowIcon = () => {
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{flexDirection: 'row'}}>
      <Icon name="open-in-new" color="primary.main" size={14} />
    </View>
  );
};
