import {useCallback, useState} from 'react';
import {
  Fab,
  Input,
  Button,
  useTheme,
  FormControl,
  Select,
  Column,
  Row,
  Text,
  Spacer,
  Pressable,
} from 'native-base';
import {useDispatch, useSelector} from '../../model/store';
import {ScreenDefinition, useNavigation} from '../../screens/AppScaffold';
import {HeaderTitle} from '@react-navigation/elements';
import {Icon} from '../common/Icons';
import {useTranslation} from 'react-i18next';
import {IconLabel} from '../common/RadioBlock';
import {updateSite} from 'terraso-client-shared/site/siteSlice';

type Props = {
  siteId: string;
};

const SiteSettingsView = ({siteId}: Props) => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const {colors} = useTheme();
  const {navigate} = useNavigation();
  const site = useSelector(state => state.site.sites[siteId]);
  const [name, setName] = useState(site.name);

  const onTeamPress = useCallback(
    () => navigate('SITE_TEAM_SETTINGS', {siteId}),
    [siteId, navigate],
  );

  const onSave = useCallback(
    () => dispatch(updateSite({...site, name})),
    [dispatch, site, name],
  );

  return (
    <>
      <Column px="16px" py="22px" space="20px" alignItems="flex-start">
        <Input
          value={name}
          onChangeText={setName}
          leftElement={<Icon ml="12px" name="edit" />}
        />
        <Pressable
          variant="subtle"
          width="full"
          background={colors.grey[200]}
          py="12px"
          pl="16px"
          pr="32px"
          onPress={onTeamPress}>
          <Row
            size="container"
            alignItems="center"
            justifyContent="space-around">
            <Icon name="people" />
            <Spacer flexGrow={0} width="16px" />
            <Text>{t('site.dashboard.team_button')}</Text>
            <Spacer />
            <Icon name="arrow-forward-ios" />
          </Row>
        </Pressable>
        <FormControl>
          <FormControl.Label>
            <IconLabel
              label={t('site.dashboard.transfer_label')}
              icon={<Icon name="info" />}
            />
          </FormControl.Label>
          <Select dropdownIcon={<Icon name="arrow-drop-down" />} />
        </FormControl>
        <Button
          pl={0}
          variant="link"
          startIcon={<Icon name="content-copy" />}
          endIcon={<Icon name="info" />}>
          {t('site.dashboard.copy_download_link_button')}
        </Button>
        <FormControl alignItems="flex-start">
          <Button
            pl={0}
            variant="link"
            startIcon={<Icon name="archive" />}
            endIcon={<Icon name="info" />}>
            {t('site.dashboard.archive_button')}
          </Button>
          <FormControl.HelperText ml="26px" mt={0}>
            {t('site.dashboard.archive_button_help_text')}
          </FormControl.HelperText>
        </FormControl>
        <Button
          pl={0}
          variant="link"
          color={colors.error.main}
          startIcon={<Icon name="delete-forever" />}>
          {t('site.dashboard.delete_button')}
        </Button>
      </Column>
      <Fab label={t('general.save_fab')} onPress={onSave} />
    </>
  );
};

export const SiteSettingsScreen: ScreenDefinition<Props> = {
  View: SiteSettingsView,
  options: ({siteId}) => ({
    /* eslint-disable react-hooks/rules-of-hooks */
    headerTitle: props => {
      const name = useSelector(state => state.site.sites[siteId].name);
      return <HeaderTitle {...props}>{name}</HeaderTitle>;
    },
  }),
};
