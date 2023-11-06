import {
  Box,
  Button,
  Column,
  Heading,
  Row,
  FlatList,
} from 'native-base';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {useTranslation} from 'react-i18next';
import {Modal} from 'terraso-mobile-client/components/common/Modal';
import SiteNote from 'terraso-client-shared/site/siteSlice';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {AddSiteNoteModal} from 'terraso-mobile-client/components/siteNotes/AddSiteNoteModal';
import {SiteNoteCard} from 'terraso-mobile-client/components/siteNotes/SiteNoteCard';

export type SiteNote = {
  id: string;
  content: string;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
};

export const SiteNotesScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const notes = useSelector(state => state.site.sites[siteId].notes);

  return (
    <BottomSheetModalProvider>
      <Column>
        <Row backgroundColor="background.default" px="16px" py="12px">
          <Heading variant="h6">{t('site.notes.title')}</Heading>
        </Row>
        <Box height="16px" />
        <Box pl={4} pb={4} alignItems="flex-start">
          <Modal
            key={siteId}
            trigger={onOpen => (
              <Button
                size="lg"
                backgroundColor="primary.dark"
                shadow={5}
                onPress={onOpen}>
                {t('site.notes.add_note_label')}
              </Button>
            )}>
            <AddSiteNoteModal siteId={siteId} />
          </Modal>
        </Box>
        <FlatList
          mb={130}
          data={Object.values(notes)}
          keyExtractor={note => note.id}
          renderItem={({item: note}) => <SiteNoteCard siteId={siteId} note={note} />}
        />
      </Column>
    </BottomSheetModalProvider>
  );
};
