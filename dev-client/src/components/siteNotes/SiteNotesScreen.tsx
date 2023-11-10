import {useCallback} from 'react';
import {Box, Button, Column, Heading, Row, FlatList} from 'native-base';
import {useSelector} from 'terraso-mobile-client/model/store';
import {useTranslation} from 'react-i18next';
import SiteNote from 'terraso-client-shared/site/siteSlice';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {SiteNoteCard} from 'terraso-mobile-client/components/siteNotes/SiteNoteCard';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

export type SiteNote = {
  id: string;
  content: string;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
};

export const SiteNotesScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const notes = useSelector(state => state.site.sites[siteId].notes);

  const onAddNote = useCallback(() => {
    navigation.navigate('ADD_SITE_NOTE', {siteId: siteId});
  }, [navigation, siteId]);

  return (
    <BottomSheetModalProvider>
      <Column>
        <Row backgroundColor="background.default" px="16px" py="12px">
          <Heading variant="h6">{t('site.notes.title')}</Heading>
        </Row>
        <Box height="16px" />
        <Box pl={4} pb={4} alignItems="flex-start">
          <Button
            size="lg"
            backgroundColor="primary.dark"
            shadow={5}
            onPress={onAddNote}>
            {t('site.notes.add_note_label')}
          </Button>
        </Box>
        <FlatList
          mb={130}
          data={Object.values(notes)}
          keyExtractor={note => note.id}
          renderItem={({item: note}) => <SiteNoteCard note={note} />}
        />
      </Column>
    </BottomSheetModalProvider>
  );
};
