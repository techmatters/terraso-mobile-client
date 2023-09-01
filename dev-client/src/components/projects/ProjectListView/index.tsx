import {
  Badge,
  Box,
  FlatList,
  Heading,
  HStack,
  Input,
  Link,
  Text,
  VStack,
} from 'native-base';
import {useTranslation} from 'react-i18next';
import AddButton from '../../common/AddButton';
import {IconButton} from '../../common/Icons';
import ProjectPreviewCard from '../ProjectPreviewCard';
import {useNavigation} from '../../../screens/AppScaffold';
import {useCallback} from 'react';
import {Project} from 'terraso-client-shared/project/projectSlice';

type Props = {
  projects: Project[];
};

export default function Index({projects}: Props) {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const onPress = useCallback(
    () => navigation.navigate('CREATE_PROJECT'),
    [navigation],
  );
  return (
    <VStack bg="grey.200" p={5} flexGrow={1} flexShrink={0} flexBasis="70%">
      {projects.length === 0 && (
        <>
          <Heading size="sm">{t('projects.none.header')}</Heading>
          <Text>{t('projects.none.info')}</Text>
          <Link _text={{color: 'primary.main'}} alignItems="center" mb="4">
            <IconButton name="open-in-new" _icon={{color: 'action.active'}} />
            {t('projects.learn_more')}
          </Link>
        </>
      )}
      <Box alignItems="flex-start" pb={3}>
        <AddButton text={t('projects.create_button')} buttonProps={{onPress}} />
      </Box>

      {projects.length > 0 && (
        <>
          <HStack alignContent="center" mb="25px">
            <Box paddingRight="13px" paddingTop="3px">
              <Badge
                position="absolute"
                top="0"
                right="0"
                rounded="full"
                px="6.5px"
                zIndex={1}
                bg="primary.lightest"
                _text={{
                  fontSize: '12px',
                }}>
                {1}
              </Badge>
              <IconButton
                name="filter-list"
                bg="primary.contrast"
                borderRadius="full"
                _icon={{color: 'action.active', size: 'sm'}}
              />
            </Box>
            {/* TODO: translation function returns null, but placeholder only accepts
        undefined */}
            <Input
              placeholder={t('search.placeholder') || undefined}
              size="sm"
              bg="background.default"
              flexGrow={1}
              ml="16px"
              maxHeight={8}
            />
          </HStack>
          <FlatList
            data={projects}
            renderItem={({item}) => <ProjectPreviewCard project={item} />}
            ItemSeparatorComponent={() => <Box height="8px" />}
            keyExtractor={project => String(project.id)}
          />
        </>
      )}
    </VStack>
  );
}
