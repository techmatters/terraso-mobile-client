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

import {Coords} from 'terraso-client-shared/types';
import {
  isValidLatitude,
  isValidLongitude,
  normalizeText,
} from 'terraso-client-shared/utils';

import {COORDINATE_PRECISION} from 'terraso-mobile-client/constants';
import {getSystemLocale} from 'terraso-mobile-client/localization';

const shortDateFormatters: Record<string, Intl.DateTimeFormat> = {};
export const formatDate = (dateString: string) => {
  const locale = getSystemLocale();
  shortDateFormatters[locale] ??= new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  return shortDateFormatters[locale]
    .format(new Date(dateString))
    .split(', ')
    .join(' ');
};

export const formatPercent = (value: number) => {
  const locale = getSystemLocale();

  return value.toLocaleString(locale, {style: 'percent'});
};

export const formatCoordinate = (value: number) => {
  const locale = getSystemLocale();

  return value.toLocaleString(locale, {
    maximumFractionDigits: COORDINATE_PRECISION,
  });
};

export const formatCoordinateInEnglish = (value: number) => {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: COORDINATE_PRECISION,
  });
};

export const formatName = (firstName: string, lastName?: string) => {
  return [lastName, firstName].filter(Boolean).join(', ');
};

export const formatFullName = (firstName: string, lastName?: string) => {
  return [firstName, lastName].filter(Boolean).join(' ');
};

export const removeKeys = (a: any, b: any) => {
  const remove = [a, b];
  let currA, currB;
  while (remove.length) {
    currA = remove.pop();
    currB = remove.pop();
    for (const keyA of Object.keys(currA)) {
      if (!(keyA in currB)) {
        delete currA[keyA];
        continue;
      }
      const valA = currA[keyA];
      const valB = currB[keyA];
      if (typeof valA !== typeof valB) {
        delete currA[keyA];
        continue;
      }
      if (typeof valA === 'object' && !Array.isArray(valA) && valA !== null) {
        remove.push(valA, valB);
      }
    }
  }
};

export const searchText = (needle: string) => (haystack?: string) =>
  haystack !== undefined ? normalizeText(haystack).includes(needle) : false;

export const equals = (a: any) => (b: any) => a === b;

export const sortCompare = (
  valA: string | number | undefined,
  valB: string | number | undefined,
  order: 'ascending' | 'descending',
): number => {
  const orderMult = order === 'ascending' ? 1 : -1;
  if (valA === undefined && valB === undefined) {
    return 0;
  }
  if (valA === undefined) {
    return orderMult * -1;
  }
  if (valB === undefined) {
    return orderMult;
  }
  if (typeof valA === 'string' && typeof valB === 'string') {
    return orderMult * valA.localeCompare(valB);
  }

  if (valA < valB) {
    return orderMult * -1;
  } else if (valA === valB) {
    return 0;
  } else {
    return orderMult;
  }
};

export const isValidCoordinates = (input: string) => {
  const coordRegex =
    /^([-+]?[1-8]?\d(?:\.\d+)?),\s*([-+]?180(?:\.0+)?|[-+]?((1[0-7]\d)|([1-9]?\d))(?:\.\d+)?)$/;

  if (!coordRegex.test(input)) {
    return false;
  }

  const [latitude, longitude] = input.split(',').map(Number);

  return isValidLatitude(latitude) && isValidLongitude(longitude);
};

export const getSoilWebUrl = (coords: Coords) => {
  return `https://casoilresource.lawr.ucdavis.edu/gmap/?loc=${coords.latitude},${coords.longitude}`;
};

export const validateUrl = (url?: string): URL | false => {
  try {
    return url ? new URL(url) : false;
  } catch {
    return false;
  }
};
