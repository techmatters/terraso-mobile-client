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
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

type Props = {
  content: string;
  isSiteInstructions?: boolean;
};

export const ReadNoteScreen = ({content, isSiteInstructions}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.pop();
  };

  return (
    <ScreenScaffold BottomNavigation={null} AppBar={null}>
      <Column pt={10} pl={5} pr={5} pb={10} flexGrow={1}>
        <Heading variant="h6" pb={7}>
          {isSiteInstructions
            ? t('projects.inputs.instructions.screen_title')
            : t('site.notes.add_title')}
        </Heading>
        <ScrollView flex={1}>
          <Text>{content}</Text>
        </ScrollView>
        <Row>
          <Spacer />
          <Button onPress={handleClose} shadow={1} size="lg">
            {t('general.close_fab')}
          </Button>
        </Row>
      </Column>
    </ScreenScaffold>
  );
};
