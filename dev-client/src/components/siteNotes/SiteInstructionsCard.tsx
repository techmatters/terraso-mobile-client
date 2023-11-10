import {Text, HStack} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Card} from 'terraso-mobile-client/components/common/Card';
import {Icon} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  siteInstructions: string;
};

export const SiteInstructionsCard = ({siteInstructions}: Props) => {
  const {t} = useTranslation();

  return (
    <Card alignItems="flex-start" shadow={4} mb={4} ml={4} mr={4}>
      <HStack>
       <Icon name="place" color="primary.dark" size="sm" mr="1" />
        <Text bold fontSize="md">
          {t('site.notes.projectInstructions')}
        </Text>
      </HStack>
      <Text pt={1} fontSize="md">
        {siteInstructions}
      </Text>
    </Card>
  );
};
