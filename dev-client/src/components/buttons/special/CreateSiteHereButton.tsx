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

import {
  CreateSiteButton,
  CreateSiteButtonProps,
} from 'terraso-mobile-client/components/buttons/special/CreateSiteButton';

export type CreateSiteHereButtonProps = CreateSiteButtonProps;

/**
 * Wrapper around CreateSiteButton with default showIcon=true and variant='contained'.
 * Requires explicit creationMethod ('map' or 'address') for PostHog tracking.
 */
export const CreateSiteHereButton = ({
  showIcon = true,
  variant = 'contained',
  ...props
}: CreateSiteHereButtonProps) => {
  return <CreateSiteButton {...props} showIcon={showIcon} variant={variant} />;
};
