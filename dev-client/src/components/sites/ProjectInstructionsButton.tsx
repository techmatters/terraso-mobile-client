import {Text, HStack, Box, Button} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {useCallback} from 'react';

type Props = {
  project: Project;
};

export const ProjectInstructionsButton = ({project}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onShowNote = useCallback(() => {
    return () =>
      navigation.navigate('READ_NOTE', {content: project.siteInstructions});
  }, [navigation, project.siteInstructions]);

  return (
    <Box pt={4} pb={4} alignItems="flex-start">
      <Button
        mt={2}
        pl={4}
        pr={4}
        size="lg"
        backgroundColor="primary.dark"
        shadow={5}
        onPress={onShowNote()}>
        <HStack>
          <Icon color="primary.contrast" size={'sm'} mr={2} name={'place'} />
          <Text color="primary.contrast">
            {t('projects.inputs.instructions.add_label')}
          </Text>
        </HStack>
      </Button>
    </Box>
  );
};
