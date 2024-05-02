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

import {MeasurementUnit} from 'terraso-client-shared/project/projectSlice';

/** Minimum distance to travel before Mapbox will update user location */
export const USER_DISPLACEMENT_MIN_DISTANCE_M = 1;
export const COORDINATE_PRECISION = 5;
export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;
export const SITE_NAME_MIN = 3;
export const SITE_NAME_MAX = 50;
export const PROJECT_NAME_MAX_LENGTH = 50;
export const PROJECT_NAME_MIN_LENGTH = 3;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 72;
export const BOTTOM_BAR_SIZE = '10%';
export const FORM_LABEL_MAX = 10;
export const PROJECT_DEFAULT_MEASUREMENT_UNITS: MeasurementUnit = 'METRIC';
export const GEOSPATIAL_CONTEXT_USER_DISTANCE_CACHE = 5;
export const SITE_NOTE_MIN_LENGTH = 3;
export const LOCALE = 'en-US';
