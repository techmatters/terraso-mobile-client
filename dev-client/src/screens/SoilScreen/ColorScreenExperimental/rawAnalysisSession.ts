/*
 * Copyright © 2026 Technology Matters
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

import {useSyncExternalStore} from 'react';

// Shared state for the RAW color-analysis flow across
// RawColorAnalysisScreen (owns the session) and RawCropScreen (writes
// back its selected crop). React Navigation renders sibling screens
// under a shared stack navigator — a React Context provider on one
// screen doesn't propagate to the other, so we use a small module-
// scope pub/sub instead. Same pattern as
// experimentalColorScreenToggle / experimentalCaptureModeToggle.
//
// Session lifetime: RawColorAnalysisScreen resets on mount (new
// capture starts fresh), and any component subscribed via
// useRawAnalysisSession() re-renders when state changes.

export type RawAnalysisRole = 'reference' | 'sample';

export type RawCrop = {top: number; left: number; size: number};

export type PreviewInfo = {
  uri: string;
  width: number;
  height: number;
};

type State = {
  preview: PreviewInfo | null;
  refCrop: RawCrop | null;
  sampleCrop: RawCrop | null;
};

let state: State = {preview: null, refCrop: null, sampleCrop: null};
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(fn => fn());

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const resetRawAnalysisSession = (preview: PreviewInfo | null): void => {
  state = {preview, refCrop: null, sampleCrop: null};
  notify();
};

export const setRawAnalysisPreview = (preview: PreviewInfo | null): void => {
  state = {...state, preview};
  notify();
};

export const setRawAnalysisCrop = (
  role: RawAnalysisRole,
  crop: RawCrop,
): void => {
  state =
    role === 'reference'
      ? {...state, refCrop: crop}
      : {...state, sampleCrop: crop};
  notify();
};

const getSnapshot = () => state;

// Convenience wrapper exposing a Session-shaped view that both screens
// call — matches the shape they used when this was a React context.
export type RawAnalysisSession = {
  preview: PreviewInfo | null;
  refCrop: RawCrop | null;
  sampleCrop: RawCrop | null;
  getCrop: (role: RawAnalysisRole) => RawCrop | null;
  setCrop: (role: RawAnalysisRole, crop: RawCrop) => void;
};

export const useRawAnalysisSession = (): RawAnalysisSession => {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return {
    preview: s.preview,
    refCrop: s.refCrop,
    sampleCrop: s.sampleCrop,
    getCrop: role => (role === 'reference' ? s.refCrop : s.sampleCrop),
    setCrop: setRawAnalysisCrop,
  };
};
