import {Badge, Box, HStack, Input, VStack} from 'native-base';
import {ProjectDescription} from '../../types';
import {useTranslation} from 'react-i18next';
import CreateProjectButton from './CreateProjectButton';
import MaterialIcon from '../MaterialIcon';

type Props = {
  projects: ProjectDescription[];
};

export default function ProjectsSearchView({projects}: Props) {
  const {t} = useTranslation();
  return (
    <VStack bg="grey.200" p={5} flexGrow={1}>
      <Box alignItems="flex-start" pb={5}>
        <CreateProjectButton />
      </Box>
      <HStack>
        <VStack>
          <Badge
            alignSelf="flex-end"
            mb={-5}
            mr={-2}
            py={0}
            rounded="full"
            zIndex={1}
            bg="none">
            2
          </Badge>
          <MaterialIcon
            name="filter-list"
            iconButtonProps={{color: 'grey.200'}}
            iconProps={{color: 'action.active'}}
          />
        </VStack>
        {/* TODO: translation function returns null, but placeholder only accepts
        undefined */}
        <Input
          maxHeight={10}
          placeholder={t('search.placeholder') || undefined}
          size="sm"
          bg="background.default"
          flexGrow={1}
          ml={4}
        />
      </HStack>
    </VStack>
  );
}
