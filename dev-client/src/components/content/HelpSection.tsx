import {StyleSheet, View} from 'react-native';

export const HelpSection = ({children}: React.PropsWithChildren) => {
  return <View style={styles.help}>{children}</View>;
};

const styles = StyleSheet.create({
  help: {
    marginLeft: 6,
  },
});
