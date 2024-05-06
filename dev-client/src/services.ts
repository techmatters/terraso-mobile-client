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

export const getElevation = async (lat: number, lng: number) => {
  // TypeScript complains if the values passed to URLSearchParams are floats instead of strings.
  // This API uses X for longitude and Y for latitude. That's not a typo.
  const params = {
    x: lng.toString(),
    y: lat.toString(),
    units: 'Meters', // TODO: switch based on user preference
  };
  let elevation = 'unknown';

  try {
    const response = await fetch(
      `https://epqs.nationalmap.gov/v1/json/?${new URLSearchParams(params)}`,
    );
    const result = await response.json();

    elevation = parseFloat(result.value).toFixed(2);
  } catch (error) {
    console.error(error);
  }
  return elevation;
};
