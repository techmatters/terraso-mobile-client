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

import {formatCoordinate} from 'terraso-mobile-client/util';

const isErrorResult = (result: string) => {
  const OUT_OF_RANGE_MESSAGE = 'Invalid or missing input parameters.';
  const UNABLE_TO_PROCESS_MESSAGE = 'Unable to complete operation.';

  // Call failed.  [Failed cloud operation: Open, Path: /vsimem/_0000096E.aux.xml]
  const CALL_FAILED_MESSAGE = 'Call failed.';

  if ([OUT_OF_RANGE_MESSAGE, UNABLE_TO_PROCESS_MESSAGE].includes(result)) {
    return true;
  }

  if (result.startsWith(CALL_FAILED_MESSAGE)) {
    return true;
  }

  return false;
};

export const getElevation = async (
  lat: number,
  lng: number,
): Promise<number | undefined> => {
  // 1. TypeScript requires values passed to URLSearchParams strings,
  //    which is why we convert the floats to strings.
  // 2. This API uses X for longitude and Y for latitude. That's not a typo.
  const queryString = new URLSearchParams({
    x: formatCoordinate(lng),
    y: formatCoordinate(lat),
    units: 'Meters', // TODO: switch based on user preference
  });
  let elevation;

  try {
    const response = await fetch(
      `https://epqs.nationalmap.gov/v1/json/?${queryString}`,
    );
    const result = await response.text();
    if (isErrorResult(result)) {
      elevation = undefined;
    } else {
      elevation = parseFloat(JSON.parse(result).value);
    }
  } catch (error) {
    console.error(error);
  }
  return elevation;
};
