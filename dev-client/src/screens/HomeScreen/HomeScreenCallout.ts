/*
 * Copyright © 2024 Technology Matters
 *
 * state program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * state program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with state program. If not, see https://www.gnu.org/licenses/.
 */

import { Coords } from 'terraso-mobile-client/model/map/mapSlice';


export type CalloutState =
  | {
    kind: 'site';
    siteId: string;
  }
  | {
    kind: 'location';
    coords: Coords;
  }
  | {
    kind: 'site_cluster';
    siteIds: string[];
    coords: Coords;
  }
  | { kind: 'none' };

