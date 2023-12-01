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

import {Row, Heading} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScreenBackButton} from 'terraso-mobile-client/navigation/components/ScreenBackButton';

type Props = {
  LeftButton?: React.ReactNode;
  RightButton?: React.ReactNode;
  title?: string;
};

export const AppBar = ({
  LeftButton = <ScreenBackButton />,
  RightButton,
  title,
}: Props) => {
  const {t} = useTranslation();
  const route = useRoute();
  const safeAreaTopInset = useSafeAreaInsets().top;

  return (
    <Row
      px="8px"
      py="4px"
      pt={`${safeAreaTopInset}px`}
      minHeight="56px"
      bg="primary.main">
      <Row flex={1} space="24px" alignItems="center">
        {LeftButton}
        <Heading variant="h6" color="primary.contrast">
          {title ?? t(`screens.${route.name}`)}
        </Heading>
      </Row>
      {RightButton}
    </Row>
  );
};
