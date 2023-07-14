import {Box, HStack, Input, Text, VStack} from 'native-base';
import RadioBlock from '../../common/RadioBlock';
import SaveFAB from '../../common/SaveFAB';
import {IconButton} from '../../common/Icons';
import {useTranslation} from 'react-i18next';

export default function CreateProjectView() {
  const {t} = useTranslation();
  return (
    <Box height="100%" pt="20%" bgColor="background.default">
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
      <SaveFAB title={t('general.save')} onPress={console.debug} />
    </Box>
  );
}
