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

import {DepthInterval} from 'terraso-client-shared/soilId/soilIdTypes';

import {getPostHogInstance} from 'terraso-mobile-client/app/posthog/posthogInstance';

export type SoilObservationType =
  | 'slope_steepness'
  | 'slope_shape'
  | 'soil_cracks'
  | 'soil_color'
  | 'soil_texture'
  | 'rock_fragment_volume'
  | 'notes';

export type SoilObservationMethod =
  | 'manual'
  | 'pictogram'
  | 'clinometer'
  | 'photo'
  | 'guided'
  | 'select';

type SoilObservationProps = {
  input_type: SoilObservationType;
  input_method: SoilObservationMethod;
  site_id: string;
  depthInterval?: DepthInterval;
};

/**
 * Track a soil observation event in PostHog.
 *
 * Call this function from screens/components where users enter soil data,
 * passing the appropriate context about how the data was entered.
 *
 * @param input_type - Type of observation (slope_steepness, soil_color, etc.)
 * @param input_method - How the data was entered (manual, pictogram, clinometer, etc.)
 * @param site_id - The site ID where the observation was made
 * @param depthInterval - Optional depth interval (for depth-dependent observations).
 *                        Records input_depth_top (start) and input_depth_bottom (end) in cm.
 */
export function trackSoilObservation({
  input_type,
  input_method,
  site_id,
  depthInterval,
}: SoilObservationProps) {
  const posthog = getPostHogInstance();
  if (!posthog) {
    return;
  }

  const event: Record<string, string | number> = {
    input_type,
    input_method,
    site_id,
  };

  // Add depth range for depth-dependent observations
  if (depthInterval) {
    event.input_depth_top = depthInterval.start;
    event.input_depth_bottom = depthInterval.end;
  }

  posthog.capture('soil_observation', event);
}
