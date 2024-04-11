/*
 * Copyright © 2024 Technology Matters
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
import {Trans, useTranslation} from 'react-i18next';
import {
  Paragraph,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SlopeMeterInfoContent = () => {
  const {t} = useTranslation();

  return (
    <>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description1')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description2')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description3')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description4')}
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.steepness.info.description5')}
      </Paragraph>
      <Paragraph variant="body1">
        <Trans i18nKey="slope.steepness.info.description6">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Paragraph>
    </>
  );
};
