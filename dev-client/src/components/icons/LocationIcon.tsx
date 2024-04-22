import {View} from 'react-native';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';

export const LocationIcon = () => {
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Icon name="my-location" color="black" size={14} />
    </View>
  );
};
