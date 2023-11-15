/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {Heading, HStack, Spacer, Box, VStack, Button} from 'native-base';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import {ScreenFormWrapper} from 'terraso-mobile-client/components/common/ScreenFormWrapper';
import {useTranslation} from 'react-i18next';
import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  updateProject,
  Project,
} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {HorizontalIconButton} from 'terraso-mobile-client/components/common/Icons';
import {Keyboard} from 'react-native';

type Props = {
  project: Project;
};

export const EditProjectInstructionsScreen = ({project}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const handleUpdateProject = async ({content}: {content: string}) => {
    Keyboard.dismiss();
    try {
      const projectInput: ProjectUpdateMutationInput = {
        id: project.id,
        siteInstructions: content,
      };
      await dispatch(updateProject(projectInput));
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      navigation.pop();
    }
  };

  const handleDelete = async (
    setSubmitting: (isSubmitting: boolean) => void,
  ) => {
    Keyboard.dismiss();
    setSubmitting(true);
    await handleUpdateProject({content: ''});
    setSubmitting(false);
  };

  return (
    <ScreenFormWrapper
      initialValues={{content: project.siteInstructions || ''}}
      onSubmit={handleUpdateProject}>
      {formikProps => {
        const {handleSubmit, isSubmitting} = formikProps;

        return (
          <VStack pt={10} pl={5} pr={5} pb={10} flex={1}>
            <Heading variant="h6" pb={7}>
              {t('projects.inputs.instructions.title')}
            </Heading>
            <Box flexGrow={1}>
              <SiteNoteForm content={formikProps.values.content || ''} />
            </Box>
            <HStack pb={4}>
              <Spacer />
              <ConfirmModal
                trigger={onOpen => (
                  <Box pt={1} pr={5}>
                    <HorizontalIconButton
                      p={0}
                      name="delete"
                      label={t('general.delete_fab').toLocaleUpperCase()}
                      colorScheme="error.main"
                      _icon={{
                        color: 'error.main',
                        size: '5',
                      }}
                      isDisabled={isSubmitting}
                      onPress={onOpen}
                    />
                  </Box>
                )}
                title={t('site.notes.confirm_removal_title')}
                body={t('site.notes.confirm_removal_body')}
                actionName={t('general.delete_fab')}
                handleConfirm={() => handleDelete(() => {})}
              />
              <Button
                onPress={() => handleSubmit()}
                isDisabled={isSubmitting}
                shadow={1}
                size={'lg'}>
                {t('general.done_fab').toLocaleUpperCase()}
              </Button>
            </HStack>
          </VStack>
        );
      }}
    </ScreenFormWrapper>
  );
};
