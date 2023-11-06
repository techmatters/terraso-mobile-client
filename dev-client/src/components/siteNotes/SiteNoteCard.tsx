import {Text, HStack, Spacer} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Modal} from 'terraso-mobile-client/components/common/Modal';
import {Card} from 'terraso-mobile-client/components/common/Card';
import {formatDate} from 'terraso-mobile-client/util';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import {EditSiteNoteModal} from 'terraso-mobile-client/components/siteNotes/EditSiteNoteModal';
import {SiteNote} from 'terraso-client-shared/site/siteSlice';

type Props = {
  note: SiteNote;
  siteId: string;
};

export const SiteNoteCard = ({note, siteId}: Props) => {
  const {t} = useTranslation();

  return (
    <Card key={note.id} alignItems="flex-start" shadow={0} mb={3} ml={4} mr={4}>
      <HStack>
        <Text italic>
          {formatDate(note.createdAt)} {t('site.notes.note_by')} {note.authorFirstName}{' '}
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
  );
};
