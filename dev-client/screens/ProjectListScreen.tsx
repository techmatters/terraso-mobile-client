import { Box, Text } from "native-base";
import { RootStackParamList, ScreenRoutes } from "./constants";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.PROJECT_LIST>;

export default function ProjectListView({route, navigation} : Props) {
    return <Box>
        <Text>This is the project list view</Text>
    </Box>
};
