import {Text} from 'native-base';

type Props = {
  done: number;
};

export default function ProgressCirle({done}: Props) {
  return <Text>{done} %</Text>;
}
