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

/**
 * This function calculated the initial snap value to the bottom sheet depending on the device specifications.
 * To adjust this function consider change the result variable to desired minimum and maximum value
 * @param bottomInsets Bottom insets value of the device
 * @returns Starting snap value in %
 */
export const getStartingSnapValue = (bottomInsets: number) => {
  // Set minimum and maximum snap values (percentage)
  const minimumSnapValue = 13;
  const maximumSnapValue = 16;

  // We set the maximum bottom insets as 34 which is the currently maximum for a device
  const weight0 = 1 - bottomInsets / 34; // Weight for 13
  const weight34 = 1 - weight0; // Weight for 16

  // Use the weights to calculate a weighted average
  const result = weight0 * minimumSnapValue + weight34 * maximumSnapValue;

  // Round the result
  return Math.round(result);
};
