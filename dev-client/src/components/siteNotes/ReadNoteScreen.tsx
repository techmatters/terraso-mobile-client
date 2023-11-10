import {Heading, HStack, Spacer, VStack, Button, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

type Props = {
  content: string;
};

export const ReadNoteScreen = ({content}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.pop();
  };

  return (
    <ScreenScaffold BottomNavigation={null} AppBar={null}>
      <VStack pt={10} pl={5} pr={5} pb={10}>
        <Heading variant="h6" pb={7}>
          {t('site.notes.add_title')}
        </Heading>
        <Text>{content}</Text>
        <HStack>
          <Spacer />
          <Button onPress={handleClose} shadow={1} size={'lg'}>
            {t('general.close_fab')}
          </Button>
        </HStack>
      </VStack>
    </ScreenScaffold>
  );
};
