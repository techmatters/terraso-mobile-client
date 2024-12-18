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

import {useTranslation} from 'react-i18next';

import {Button, ScrollView, Spacer} from 'native-base';

import {
  useHandleMissingSiteOrProject,
  usePopNavigationAndSyncError,
} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {ScreenDataRequirements} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';
import {selectProject} from 'terraso-mobile-client/store/selectors';

type Props = {
  projectId: string;
};

export const ReadPinnedNoteScreen = ({projectId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const project = useSelector(selectProject(projectId));
  const content = project?.siteInstructions;

  const handleClose = () => {
    navigation.pop();
  };

  const handleMissingProject = useHandleMissingSiteOrProject();
  const handleMissingPinnedNote = usePopNavigationAndSyncError();
  const requirements = [
    {data: project, doIfMissing: handleMissingProject},
    {data: content, doIfMissing: handleMissingPinnedNote},
  ];

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold BottomNavigation={null} AppBar={null}>
          <Column pt={10} pl={5} pr={5} pb={10} flexGrow={1}>
            <Heading variant="h6" pb={7}>
              {t('projects.inputs.instructions.screen_title')}
            </Heading>
            <ScrollView flex={1}>
              <Text>{content}</Text>
            </ScrollView>
            <Row>
              <Spacer />
              <Button
                onPress={handleClose}
                shadow={1}
                size="lg"
                _text={{textTransform: 'uppercase'}}>
                {t('general.close_fab')}
              </Button>
            </Row>
          </Column>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
