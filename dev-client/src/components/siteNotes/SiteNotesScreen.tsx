import {useState} from 'react';
import {
  Box,
  Button,
  Column,
  Heading,
  Row,
  Text,
  VStack,
  HStack,
  Spacer,
  FlatList,
} from 'native-base';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {useTranslation} from 'react-i18next';
import {
  BottomSheetModal,
  Modal,
  useModal,
} from 'terraso-mobile-client/components/common/Modal';
import {deleteSiteNote} from 'terraso-client-shared/site/siteSlice';
import {useCallback} from 'react';
import SiteNote from 'terraso-client-shared/site/siteSlice';
import {Card} from 'terraso-mobile-client/components/common/Card';
import {formatDate} from 'terraso-mobile-client/util';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import * as yup from 'yup';
import {Formik} from 'formik';
import {FormInput} from 'terraso-mobile-client/components/common/Form';
import {AddSiteNoteModal} from 'terraso-mobile-client/components/siteNotes/AddSiteNoteModal';
import {EditSiteNoteModal} from 'terraso-mobile-client/components/siteNotes/EditSiteNoteModal';

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
  const dispatch = useDispatch();

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
          renderItem={({item: note}) => (
            <Card
              key={note.id}
              alignItems="flex-start"
              shadow={0}
              mb={3}
              ml={4}
              mr={4}>
              <HStack>
                <Text italic>
                  {formatDate(note.createdAt)} by {note.authorFirstName}{' '}
                  {note.authorLastName}
                </Text>
                <Spacer />
                <Modal
                  key={siteId}
                  trigger={onOpen => (
                    <IconButton
                    p={0}
                    name="edit"
                    _icon={{
                      color: 'grey.600',
                      size: '5',
                    }}
                    onPress={onOpen}
                  />
                  )}>
                  <EditSiteNoteModal note={note} />
                </Modal>
              </HStack>
              <Text pt={1} fontSize="md">
                {note.content}
              </Text>
            </Card>
          )}
        />
      </Column>
    </BottomSheetModalProvider>
  );
};
