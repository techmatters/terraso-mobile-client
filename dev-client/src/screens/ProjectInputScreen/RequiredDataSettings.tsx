import {Row, Text, Box, useTheme} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  collectionMethods,
  methodRequired,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Switch} from 'react-native';

export const RequiredDataSettings = ({projectId}: {projectId: string}) => {
  const {t} = useTranslation();
  const settings = useSelector(
    state => state.soilId.projectSettings[projectId],
  );
  const dispatch = useDispatch();
  const {colors} = useTheme();

  return (
    <Box p={4}>
      {collectionMethods.map(method => (
        <Row
          key={method}
          pt={2}
          pb={5}
          justifyContent="flex-start"
          alignItems="center">
          <Switch
            value={settings[methodRequired(method)]}
            thumbColor={
              settings[methodRequired(method)]
                ? colors.primary.main
                : colors.primary.contrast
            }
            onValueChange={value => {
              dispatch(
                updateProjectSoilSettings({
                  projectId,
                  [methodRequired(method)]: value,
                }),
              );
            }}
          />
          <Text bold pl={2} fontSize={'md'}>
            {t(`soil.collection_method.${method}`)}
          </Text>
        </Row>
      ))}
    </Box>
  );
};
