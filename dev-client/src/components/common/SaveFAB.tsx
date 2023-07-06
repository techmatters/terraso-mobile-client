import {Fab} from 'native-base';

type Props = {
  title: string;
  onPress?: () => void;
};
export default function SaveFAB(props: Props) {
  return (
    <Fab
      label={props.title.toUpperCase()}
      px={5}
      borderRadius={3}
      onPress={props.onPress}
    />
  );
}
