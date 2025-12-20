/*
 * Copyright © 2025 Technology Matters
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

import {StyleSheet} from 'react-native';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type AlertVariant = 'warning' | 'error' | 'info';
type AlertProps = React.PropsWithChildren<{
  title?: string;
  bodyText: string;
  variant: AlertVariant;
}>;

export const Alert = ({title, bodyText, variant}: AlertProps) => {
  const boxStyle = boxStyleForVariant(variant);
  return (
    <Box
      borderWidth="2px"
      borderRadius="4px"
      padding="md"
      backgroundColor={boxStyle.backgroundColor}
      borderColor={boxStyle.borderColor}>
      <Row>
        <AlertIcon variant={variant} />
        <Column flex={1}>
          <TitleText variant={variant} text={title} />
          <BodyText variant={variant} text={bodyText} />
        </Column>
      </Row>
    </Box>
  );
};

const boxStyleForVariant = (variant: AlertVariant) => {
  switch (variant) {
    case 'warning':
      return styles.warningBox;
    case 'info':
      return styles.infoBox;
    case 'error':
    default:
      return styles.errorBox;
  }
};

const AlertIcon = ({variant}: {variant: AlertVariant}) => {
  const marginRight = 'md';
  const size = 'md';
  switch (variant) {
    case 'warning':
      return (
        <Icon
          name="warning-amber"
          color="warning.main"
          mr={marginRight}
          size={size}
        />
      );
    case 'info':
      return (
        <Icon
          name="info-outline"
          color="info.icon"
          mr={marginRight}
          size={size}
        />
      );
    case 'error':
    default:
      return (
        <Icon
          name="error-outline"
          color="error.main"
          mr={marginRight}
          size={size}
        />
      );
  }
};

type VariantTextProps = {
  variant: AlertVariant;
  text?: string;
};

const TitleText = ({variant, text}: VariantTextProps) => {
  const textVariant = 'body1-strong';
  const marginBottom = 'sm';

  switch (variant) {
    case 'warning':
      return (
        <Text variant={textVariant} color="warning.content" mb={marginBottom}>
          {text}
        </Text>
      );
    case 'info':
      return (
        <Text variant={textVariant} color="info.title" mb={marginBottom}>
          {text}
        </Text>
      );
    case 'error':
    default:
      return (
        <Text variant={textVariant} color="error.content" mb={marginBottom}>
          {text}
        </Text>
      );
  }
};

const BodyText = ({variant, text}: VariantTextProps) => {
  const textVariant = 'body1';
  const marginBottom = 'sm';

  switch (variant) {
    case 'warning':
      return (
        <Text variant={textVariant} color="error.content" mb={marginBottom}>
          {text}
        </Text>
      );
    case 'info':
      return (
        <Text variant={textVariant} color="info.content" mb={marginBottom}>
          {text}
        </Text>
      );
    case 'error':
    default:
      return (
        <Text variant={textVariant} color="error.content" mb={marginBottom}>
          {text}
        </Text>
      );
  }
};

const styles = StyleSheet.create({
  warningBox: {
    backgroundColor: 'primary.contrast',
    borderColor: 'warning.main',
  },
  infoBox: {
    backgroundColor: 'info.background',
    borderColor: 'info.border',
  },
  errorBox: {
    backgroundColor: 'error.background',
    borderColor: 'error.main',
  },
});
