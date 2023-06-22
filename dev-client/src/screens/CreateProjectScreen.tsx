import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList, ScreenRoutes} from "./constants";
import {Box} from "native-base";

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.CREATE_PROJECT>;

export default function CreateProjectScreen({route}: Props) {
  return <Box></Box>;
}
