import {useCallback} from 'react';
import {Text, HStack} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Card} from 'terraso-mobile-client/components/common/Card';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

type Props = {
  siteInstructions: string;
};

export const SiteInstructionsCard = ({siteInstructions}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onShowNote = useCallback(() => {
    navigation.navigate('READ_NOTE', {
      content: siteInstructions,
      isSiteInstructions: true,
    });
  }, [navigation, siteInstructions]);

  return (
    <Card
      alignItems="flex-start"
      shadow={4}
      mb={4}
      ml={4}
      mr={4}
      onPress={onShowNote}>
      <HStack>
        <Icon name="place" color="primary.dark" size="sm" mr="1" />
        <Text bold fontSize="md">
          {t('site.notes.projectInstructions')}
        </Text>
      </HStack>
      <Text pt={1} fontSize="md" numberOfLines={3} ellipsizeMode="tail">
        {siteInstructions}
      </Text>
    </Card>
  );
};
