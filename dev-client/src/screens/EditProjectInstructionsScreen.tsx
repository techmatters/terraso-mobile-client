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

import {useState, useRef} from 'react';
import {Heading, Box, VStack} from 'native-base';
import {useDispatch} from 'terraso-mobile-client/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/SiteNoteForm';
import {ScreenFormWrapper} from 'terraso-mobile-client/components/ScreenFormWrapper';
import {useTranslation} from 'react-i18next';
import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {updateProject} from 'terraso-client-shared/project/projectSlice';
import {Keyboard} from 'react-native';
import {
  RootNavigatorScreenProps,
  RootNavigatorScreens,
} from 'terraso-mobile-client/navigation/types';

type Props =
  RootNavigatorScreenProps<RootNavigatorScreens.EDIT_PROJECT_INSTRUCTIONS>;

export const EditProjectInstructionsScreen = ({route, navigation}: Props) => {
  const {project} = route.params;

  const formWrapperRef = useRef<{handleSubmit: () => void}>(null);
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProject = async ({content}: {content: string}) => {
    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      const projectInput: ProjectUpdateMutationInput = {
        id: project.id,
        siteInstructions: content,
      };
      await dispatch(updateProject(projectInput));
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSubmitting(false);
      navigation.pop();
    }
  };

  const handleDelete = async () => {
    await handleUpdateProject({content: ''});
  };

  return (
    <ScreenFormWrapper
      ref={formWrapperRef}
      initialValues={{content: project.siteInstructions || ''}}
      onSubmit={handleUpdateProject}
      onDelete={handleDelete}
      isSubmitting={isSubmitting}>
      {formikProps => (
        <VStack pt={10} pl={5} pr={5} pb={10} flex={1}>
          <Heading variant="h6" pb={7}>
            {t('projects.inputs.instructions.title')}
          </Heading>
          <Box flexGrow={1}>
            <SiteNoteForm content={formikProps.values.content || ''} />
          </Box>
        </VStack>
      )}
    </ScreenFormWrapper>
  );
};
