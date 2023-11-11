import {
  Heading,
  HStack,
  Spacer,
  VStack,
  Button,
  Text,
  ScrollView,
} from 'native-base';
import {useTranslation} from 'react-i18next';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

type Props = {
  content: string;
  isSiteInstructions?: boolean;
};

export const ReadNoteScreen = ({content, isSiteInstructions}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.pop();
  };

  return (
    <ScreenScaffold BottomNavigation={null} AppBar={null}>
      <VStack pt={10} pl={5} pr={5} pb={10} flexGrow={1}>
        <Heading variant="h6" pb={7}>
          {isSiteInstructions
            ? t('projects.inputs.instructions.screen_title')
            : t('site.notes.add_title')}
        </Heading>
        <ScrollView flex={1}>
          <Text>{content}</Text>
        </ScrollView>
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
