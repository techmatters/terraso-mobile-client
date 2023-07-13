import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {Box, HStack, Input, Text, VStack} from 'native-base';
import RadioBlock from '../components/common/RadioBlock';
import {IconButton} from '../components/common/Icons';
import SaveFAB from '../components/common/SaveFAB';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.CREATE_PROJECT
>;

export default function CreateProjectScreen({}: Props) {
  const {t} = useTranslation();
  const onPress = useCallback(() => {
    console.debug(' save was pressed');
  }, []);

  return (
    <Box height="100%" pt={100} bgColor="background.default">
      <VStack space={6} mx={5}>
        <Input placeholder={t('projects.add.name')} />
        <Input placeholder={t('projects.add.description')} />
        <RadioBlock<'public' | 'private'>
          label={
            <HStack alignItems="center">
              <Text>Data Privacy</Text>
              <IconButton name="info" _icon={{color: 'action.active'}} />
            </HStack>
          }
          options={{
            public: {text: t('projects.add.public')},
            private: {text: t('projects.add.private')},
          }}
          blockName="data-privacy"
        />
      </VStack>
      <SaveFAB title={t('general.save')} onPress={onPress} />
    </Box>
  );
}
