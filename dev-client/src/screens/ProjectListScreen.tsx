import {useCallback, useMemo} from 'react';
import {useSelector} from 'terraso-mobile-client/model/store';
import {AppBar, AppBarIconButton, ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {Box, FlatList, Heading, Link, Text, VStack} from 'native-base';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import AddButton from 'terraso-mobile-client/components/common/AddButton';
import ProjectPreviewCard from 'terraso-mobile-client/components/projects/ProjectPreviewCard';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {useTextSearch} from 'terraso-mobile-client/components/common/search/search';

export const ProjectListScreen = () => {
  const allProjects = useSelector(state => state.project.projects);
  const activeProjects = useMemo(
    () => Object.values(allProjects).filter(project => !project.archived),
    [allProjects],
  );
  const {
    results: searchedProjects,
    query,
    setQuery,
  } = useTextSearch({data: activeProjects, keys: ['name']});

  const {t} = useTranslation();
  const navigation = useNavigation();
  const onPress = useCallback(
    () => navigation.navigate('CREATE_PROJECT'),
    [navigation],
  );

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          LeftButton={<AppBarIconButton name="menu" />}
          RightButton={<AppBarIconButton name="help" />}
        />
      }>
      <VStack bg="grey.200" p={5} flexGrow={1} flexShrink={0} flexBasis="70%">
        {activeProjects.length === 0 && (
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
          <AddButton
            text={t('projects.create_button')}
            buttonProps={{onPress}}
          />
        </Box>

        {activeProjects.length > 0 && (
          <>
            <SearchBar
              query={query}
              setQuery={setQuery}
              placeholder={t('projects.search.placeholder')}
              FilterOptions={<Text>Project filter placeholder</Text>}
            />
            <FlatList
              data={searchedProjects}
              renderItem={({item}) => <ProjectPreviewCard project={item} />}
              ItemSeparatorComponent={() => <Box h="8px" />}
              keyExtractor={project => project.id}
              ListEmptyComponent={
                <Text>{t('projects.search.no_matches')}</Text>
              }
            />
          </>
        )}
      </VStack>
    </ScreenScaffold>
  );
};
