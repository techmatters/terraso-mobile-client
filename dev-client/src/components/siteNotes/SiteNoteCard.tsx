import {useCallback} from 'react';
import {Text, HStack, Spacer} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Card} from 'terraso-mobile-client/components/common/Card';
import {formatDate} from 'terraso-mobile-client/util';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import {SiteNote} from 'terraso-client-shared/site/siteSlice';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

type Props = {
  note: SiteNote;
};

export const SiteNoteCard = ({note}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onEditNote = useCallback(() => {
    navigation.navigate('EDIT_SITE_NOTE', {note: note});
  }, [navigation, note]);

  const onShowNote = useCallback(() => {
    navigation.navigate('READ_NOTE', {content: note.content});
  }, [navigation, note.content]);

  return (
    <Card
      key={note.id}
      alignItems="flex-start"
      shadow={0}
      mb={3}
      ml={4}
      mr={4}
      onPress={onShowNote}>
      <HStack>
        <Text italic>
          {formatDate(note.createdAt)} {t('site.notes.note_by')}{' '}
          {note.authorFirstName} {note.authorLastName}
        </Text>
        <Spacer />
        <IconButton
          p={0}
          name="edit"
          _icon={{
            color: 'primary.dark',
            size: '5',
          }}
          onPress={onEditNote}
        />
      </HStack>
      <Text pt={1} fontSize="md" numberOfLines={3} ellipsizeMode="tail">
        {note.content}
      </Text>
    </Card>
  );
};
