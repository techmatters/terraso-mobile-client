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

import {useEffect, useState} from 'react';

import {
  linearToSrgb255,
  measuredLinearFromJpegCrop,
  predictColorFromLinear,
  predictMhvcFromLinear,
} from 'terraso-mobile-client/model/color/colorDetection';
import {measuredLinearFromDng} from 'terraso-mobile-client/model/color/dngColorAnalysis';
import {ColorResult, MunsellHVC} from 'terraso-mobile-client/model/color/types';
import {useSelectedReference} from 'terraso-mobile-client/model/rawColor/referenceColorSelection';
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';
import type {Rgb255} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorPipelineGrid';
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';

const toRgb255 = (c: LinearRgb): Rgb255 => [
  linearToSrgb255(c.r),
  linearToSrgb255(c.g),
  linearToSrgb255(c.b),
];

export type PipelineMeasured = {
  referenceLinear: LinearRgb;
  soilLinear: LinearRgb;
  referenceRgb: Rgb255;
  soilRgb: Rgb255;
  // Corrected soil as a pre-snap Munsell chip (needs a selected reference).
  predicted?: MunsellHVC;
};

export type UseColorPipeline = {
  loading: boolean;
  measured: PipelineMeasured | null;
  // Saveable result (nearest catalogued soil colour). Null until both regions
  // are measured AND a reference card is selected.
  colorResult: ColorResult | null;
  // Measurement threw (e.g. a DNG that neither the reduced-ROI decode nor the
  // raw preview could read) — lets the UI show an error instead of a silently
  // disabled Save that never resolves.
  error: boolean;
};

/**
 * Shared measurement + linear correction for the color-analysis flow. Reads the
 * reference/soil crops (and DNG, if any) from the analysis context, measures
 * each region as linear sRGB — raw sensor dominant for a DNG, 8-bit dominant for
 * JPEG/HEIC/PNG — then applies the picked reference card's white-balance in
 * linear and maps to Munsell. Used by both the info/explainer screen and the
 * combined prototype screen so they show identical numbers.
 *
 * `overrides` lets a caller substitute a curated measured colour for either
 * region (the dominant-colour editor's result) without re-running the decode.
 */
export const useColorPipeline = (overrides?: {
  reference?: LinearRgb;
  soil?: LinearRgb;
}): UseColorPipeline => {
  const {
    dngUri,
    state: {reference, soil},
  } = useColorAnalysisContext();
  const {reference: selectedRef} = useSelectedReference();

  const [raw, setRaw] = useState<{
    referenceLinear: LinearRgb;
    soilLinear: LinearRgb;
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!reference || !soil) {
      setRaw(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setError(false);
    // Measurement is CPU-bound (and native for DNG) — yield a frame first.
    const timer = setTimeout(() => {
      (async () => {
        try {
          const m =
            dngUri && reference.displayRoi && soil.displayRoi
              ? await measuredLinearFromDng({
                  dngUri,
                  referenceRoi: reference.displayRoi,
                  soilRoi: soil.displayRoi,
                })
              : {
                  reference: measuredLinearFromJpegCrop(reference.photo),
                  soil: measuredLinearFromJpegCrop(soil.photo),
                };
          if (!cancelled) {
            setRaw({referenceLinear: m.reference, soilLinear: m.soil});
          }
        } catch (err) {
          if (!cancelled) {
            console.warn('[colorPipeline] measure failed', err);
            setRaw(null);
            setError(true);
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference, soil, dngUri]);

  const hasInputs = !!reference && !!soil;
  if (!raw) {
    return {
      loading: hasInputs && !error,
      measured: null,
      colorResult: null,
      error,
    };
  }

  const referenceLinear = overrides?.reference ?? raw.referenceLinear;
  const soilLinear = overrides?.soil ?? raw.soilLinear;
  const predicted = selectedRef
    ? predictMhvcFromLinear(referenceLinear, soilLinear, selectedRef.expected)
    : undefined;

  return {
    loading: false,
    error: false,
    measured: {
      referenceLinear,
      soilLinear,
      referenceRgb: toRgb255(referenceLinear),
      soilRgb: toRgb255(soilLinear),
      predicted,
    },
    colorResult: selectedRef
      ? predictColorFromLinear(
          referenceLinear,
          soilLinear,
          selectedRef.expected,
        )
      : null,
  };
};
