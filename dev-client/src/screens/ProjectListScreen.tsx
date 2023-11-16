import {useCallback, useMemo} from 'react';
import {useSelector} from 'terraso-mobile-client/model/store';
import {
  AppBar,
  AppBarIconButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {Box, Heading, Link, Text, VStack, Spinner} from 'native-base';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import AddButton from 'terraso-mobile-client/components/common/AddButton';
import {
  ListFilterModal,
  ListFilterProvider,
  SelectFilter,
  TextInputFilter,
} from 'terraso-mobile-client/components/common/ListFilter';
import {selectProjectUserRolesMap} from 'terraso-client-shared/selectors';
import ProjectList from 'terraso-mobile-client/components/projects/ProjectList';
import {equals, normalizeText, searchText} from 'terraso-mobile-client/util';

export const ProjectListScreen = () => {
  const allProjects = useSelector(state => state.project.projects);
  const activeProjects = useMemo(
    () => Object.values(allProjects).filter(project => !project.archived),
    [allProjects],
  );
  const projectRoleLookup = useSelector(state =>
    selectProjectUserRolesMap(state),
  );

  const {t} = useTranslation();
  const navigation = useNavigation();
  const onPress = useCallback(
    () => navigation.navigate('CREATE_PROJECT'),
    [navigation],
  );
  const isLoadingData = useSelector(state => state.soilId.loading);

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          LeftButton={<AppBarIconButton name="menu" />}
          RightButton={<AppBarIconButton name="help" />}
        />
      }>
      <VStack
        bg="grey.200"
        p={5}
        flexGrow={1}
        flexShrink={0}
        flexBasis="70%"
        space="10px">
        <Box alignItems="flex-start" pb={3}>
          <AddButton
            text={t('projects.create_button')}
            buttonProps={{onPress}}
          />
        </Box>

        {isLoadingData ? (
          <Spinner size="lg" />
        ) : (
          activeProjects.length === 0 && (
            <>
              <Heading size="sm">{t('projects.none.header')}</Heading>
              <Text>{t('projects.none.info')}</Text>
              <Link _text={{color: 'primary.main'}} alignItems="center" mb="4">
                <IconButton
                  name="open-in-new"
                  _icon={{color: 'action.active'}}
                />
                {t('projects.learn_more')}
              </Link>
            </>
          )
        )}

        {activeProjects.length > 0 && (
          <ListFilterProvider
            items={activeProjects}
            filters={{
              search: {
                kind: 'filter',
                f: searchText,
                preprocess: normalizeText,
                lookup: {key: 'name'},
                hide: true,
              },
              role: {
                kind: 'filter',
                f: equals,
                lookup: {key: 'id', record: projectRoleLookup},
              },
            }}>
            <ListFilterModal
              searchInput={
                <TextInputFilter
                  name="search"
                  label={t('projects.search_label')}
                  placeholder={t('projects.search_placeholder')}
                />
              }>
              <SelectFilter
                name="role"
                label={t('projects.role_filter_label')}
                placeholder=""
                options={{
                  manager: t('general.role.manager'),
                  contributor: t('general.role.contributor'),
                  viewer: t('general.role.viewer'),
                }}
              />
            </ListFilterModal>
            <ProjectList />
          </ListFilterProvider>
        )}
      </VStack>
    </ScreenScaffold>
  );
};
