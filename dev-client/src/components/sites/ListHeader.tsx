import {HStack, Heading, Text, VStack} from 'native-base';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {useTranslation} from 'react-i18next';
import {memo} from 'react';
import {FormTooltip} from 'terraso-mobile-client/components/common/Form';
import {HeaderProps} from 'terraso-mobile-client/screens/SiteTransferProjectScreen';

export const ListHeader = memo(({query, setQuery}: HeaderProps) => {
  const {t} = useTranslation();
  return (
    <VStack space="10px" px="12px" pt="5%">
      <HStack>
        <Heading>{t('projects.transfer_sites.heading', '')}</Heading>
        <FormTooltip icon="help">
          {t('projects.transfer_sites.tooltip')}
        </FormTooltip>
      </HStack>
      <Text>{t('projects.transfer_sites.description', '')}</Text>
      <SearchBar
        query={query}
        setQuery={setQuery}
        placeholder={t('site.search.placeholder')}
      />
    </VStack>
  );
});
