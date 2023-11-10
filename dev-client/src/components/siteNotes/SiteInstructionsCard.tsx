import {Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Card} from 'terraso-mobile-client/components/common/Card';

type Props = {
  siteInstructions: string;
};

export const SiteInstructionsCard = ({siteInstructions}: Props) => {
  const {t} = useTranslation();

  return (
    <Card alignItems="flex-start" shadow={0} mb={3} ml={4} mr={4}>
      <Text pt={1} fontSize="md">
        {siteInstructions}
      </Text>
    </Card>
  );
};
