import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {Box, HStack, Input, Text, VStack} from 'native-base';
import RadioBlock from '../components/common/RadioBlock';
import MaterialIconButton from '../components/common/MaterialIconButton';
import SaveFAB from '../components/common/SaveFAB';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.CREATE_PROJECT
>;

export default function CreateProjectScreen({route}: Props) {
  const {t} = useTranslation();
  const onPress = useCallback(() => {
    console.debug(' save was pressed');
  }, []);

  return (
    <Box height="100%" pt={100} bgColor="background.default">
      <VStack space={6} mx={5}>
        <Input placeholder={t('projects.add.name')} />
        <Input placeholder={t('projects.add.description')} />
        <RadioBlock
          label={
            <HStack alignItems="center">
              <Text>Data Privacy</Text>
              <MaterialIconButton
                name="info"
                iconProps={{color: 'action.active'}}
              />
            </HStack>
          }
          options={[
            {text: t('projects.add.public'), value: 'public'},
            {text: t('projects.add.private'), value: 'private'},
          ]}
          blockName="data-privacy"
        />
      </VStack>
      <SaveFAB title={t('general.save')} onPress={onPress} />
    </Box>
  );
}
