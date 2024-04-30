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

import {Button} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useCallback} from 'react';
import {Project} from 'terraso-client-shared/project/projectSlice';
import {
  HStack,
  Box,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  project: Project;
};

export const ProjectInstructionsButton = ({project}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onShowNote = useCallback(() => {
    return () =>
      navigation.navigate('READ_NOTE', {
        content: project.siteInstructions || '',
        isSiteInstructions: true,
      });
  }, [navigation, project.siteInstructions]);

  return (
    <Box pt={4} pb={4} alignItems="flex-start">
      <Button
        mt={2}
        pl={4}
        pr={4}
        size="md"
        backgroundColor="primary.dark"
        shadow={5}
        onPress={onShowNote()}>
        <HStack>
          <Icon color="primary.contrast" size={'sm'} mr={2} name={'push-pin'} />
          <Text color="primary.contrast" textTransform={'uppercase'}>
            {t('projects.inputs.instructions.add_label')}
          </Text>
        </HStack>
      </Button>
    </Box>
  );
};
