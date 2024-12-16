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
  CollectionMethod,
  DepthInterval,
  SoilPitMethod,
} from 'terraso-client-shared/soilId/soilIdTypes';

export const methodEnabled = <T extends SoilPitMethod>(
  method: T,
): `${T}Enabled` => `${method}Enabled`;

export const methodRequired = <T extends CollectionMethod>(
  method: T,
): `${T}Required` => `${method}Required`;

export const depthIntervalKey = (depthInterval: DepthInterval): string => {
  return `${depthInterval.start}-${depthInterval.end}`;
};

export const sameDepth =
  ({depthInterval: a}: {depthInterval: DepthInterval}) =>
  ({depthInterval: b}: {depthInterval: DepthInterval}) =>
    a.start === b.start && a.end === b.end;

export const overlaps =
  ({depthInterval: a}: {depthInterval: DepthInterval}) =>
  ({depthInterval: b}: {depthInterval: DepthInterval}) =>
    Math.max(a.start, b.start) < Math.min(a.end, b.end);

export const compareInterval = (
  {depthInterval: a}: {depthInterval: DepthInterval},
  {depthInterval: b}: {depthInterval: DepthInterval},
) => a.start - b.start;
