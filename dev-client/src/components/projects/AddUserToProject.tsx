import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from '../../screens/constants';
import {useTranslation} from 'react-i18next';
import {Box, Input, Text, VStack} from 'native-base';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.ADD_USER_TO_PROJECT
>;

export default function AddUserToProject({}: Props) {
  const {t} = useTranslation();

  return (
    <Box height="100%" pt={100} bgColor="background.default">
      <VStack space={6} mx={5}>
        <Text fontSize={34} fontWeight={400}>
          {t('projects.team_member.tittle')}
        </Text>
        <Text fontSize={16} fontWeight={400}>
          {t('projects.team_member.description')}
        </Text>
        <Input placeholder={t('projects.team_member.email_search')} />
      </VStack>
    </Box>
  );
}
