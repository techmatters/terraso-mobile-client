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

export const SOIL_DATA: any = {
  depthDependentData: [
    {
      depthInterval: {start: 0, end: 10},
      texture: 'CLAY',
      colorChroma: 0.5,
      colorHue: 0.5,
      colorValue: 0.5,
      rockFragment: 'VOLUME_60',
    },
    {
      depthInterval: {start: 11, end: 20},
      texture: 'SANDY_CLAY_LOAM',
      colorChroma: 0.4,
      colorHue: 0.4,
      colorValue: 0.4,
      rockFragment: 'VOLUME_1_15',
    },
    {
      depthInterval: {start: 100, end: 120},
      texture: undefined,
      colorChroma: undefined,
      colorHue: undefined,
      colorValue: undefined,
      rockFragment: undefined,
    },
  ],
};
