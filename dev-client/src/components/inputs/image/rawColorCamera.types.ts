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

import type {ReactNode} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';

/**
 * Contract for the reusable RAW color camera. Three independent pieces
 * (see docs/camera-raw-capabilities.md and raw-capture-integration-plan.md):
 *
 *   1. CAMERA   — produces the preview + captures; ROI-agnostic. Its only tie
 *                 to analysis is an optional frame sink (`analyze`).
 *   2. ANALYZER — receives frames and does whatever it wants (its own ROIs,
 *                 its own math, emits however it likes). Injected + swappable;
 *                 the per-frame compute is native (iOS worklet / Android
 *                 ImageAnalysis thread), but the JS-facing contract is uniform.
 *   3. OVERLAY  — plain app UI (`children`), drawn from the analyzer's output.
 *
 * The camera resolves the request against device capabilities and owns the
 * shutter-time reconfigure (Android stream swap / iOS format detach) so the
 * "can't have preview+analysis+raw+jpeg all at once" constraint lives in one
 * place, invisible to callers.
 */

/** Fractional rectangle (0..1) in the sensor-aspect preview frame. */
export type Roi = {x: number; y: number; w: number; h: number};

/** Linear (pre-gamma) RGB, ~0..1. */
export type LinearRgb = {r: number; g: number; b: number};

/**
 * Per-ROI live stats emitted by an analyzer while framing. These are
 * Y-plane (luma) stats — a *framing-quality* signal, NOT color. The
 * authoritative color is always the post-capture RAW decode (decodeRois).
 */
export type RoiStats = {
  /** Index into the analyzer's configured ROIs. */
  roi: number;
  /** Mean luma over the ROI (0..255). */
  mean: number;
  /** Luma variance — low = uniform/well-framed (drives red/green feedback). */
  variance: number;
};

/**
 * The injected analyzer. Opaque to the app: obtained from a factory
 * (e.g. createRoiAnalyzer) and handed to the camera via `request.analyze`.
 * The camera pumps frames into it natively; it emits its own results. The
 * underlying native impl is per-platform; this handle is the uniform surface.
 */
export interface FrameAnalyzer {
  /** Stop emitting and release native resources. */
  dispose(): void;
}

/** Config for the built-in ROI-variance analyzer (createRoiAnalyzer). */
export type RoiAnalyzerConfig = {
  rois: Roi[];
  /** Called ~per analyzed frame (throttled natively). Drive your overlay here. */
  onStats: (stats: RoiStats[]) => void;
};

/** What the app declares it wants from a capture session. */
export type CaptureRequest = {
  /** Capture RAW/DNG when the device supports it. Default: true. */
  raw?: boolean;
  /**
   * HAL/ISP JPEG policy:
   *   'always'   → always produce a JPEG (companion to RAW, or standalone)
   *   'fallback' → JPEG only when RAW is unavailable
   *   'never'    → never produce a JPEG (RAW-only; nothing if no RAW)
   * Default: 'always'.
   */
  jpeg?: 'always' | 'fallback' | 'never';
  /** Optional live analysis while framing. Omit → no analysis stream. */
  analyze?: FrameAnalyzer;
};

/** Where/whether to persist a capture (all optional; default: don't persist). */
export type SaveOptions = {
  dng?: boolean;
  jpeg?: boolean;
  /** Target directory (default: a managed app-cache subdir). */
  dir?: string;
};

/** Per-shot options passed to capture(). */
export type ShotOptions = {
  /** Fires the instant the sensor readout is done → "safe to move". */
  onCaptured?: () => void;
  /** Persist to disk. Default: false (in-memory only, nothing written). */
  save?: SaveOptions | false;
};

/**
 * A completed capture. Resolves fast (sensor read out → safe to move); the
 * expensive decode is a separate, motion-safe step the caller invokes.
 */
export type Capture = {
  /** Sensor dims the fractional ROIs map onto. */
  width: number;
  height: number;
  hasRaw: boolean;
  hasJpeg: boolean;
  /**
   * How many retries this capture needed before succeeding (0 = first try).
   * Diagnostic — lets callers observe how often the reconfigure-race retry
   * (Android session-not-streaming / iOS non-DNG reconfigure) kicks in.
   */
  retries: number;
  /** Decode N ROIs in a single pass. Returns one color per ROI, in order. */
  decodeRois(rois: Roi[]): Promise<LinearRgb[]>;
  /** Display-ready downscaled render of the capture (for an ROI picker, etc.). */
  renderPreview(
    maxDim: number,
  ): Promise<{uri: string; width: number; height: number}>;
  /** Persist on demand; returns the URIs written. Optional — see SaveOptions. */
  save(opts?: SaveOptions): Promise<{dngUri?: string; jpegUri?: string}>;
  /** Free in-memory buffers (and any temp files not saved). */
  dispose(): void;
};

/** What the camera resolved the request to, given the device. */
export type ResolvedCapabilities = {
  rawAvailable: boolean;
  willCaptureRaw: boolean;
  willCaptureJpeg: boolean;
  analysisActive: boolean;
  /** True = capturing requires a brief reconfigure/detach at the shutter. */
  switchesAtCapture: boolean;
};

/** Imperative handle (via ref). capture() drives both real UI and automation. */
export type RawColorCameraHandle = {
  capture(opts?: ShotOptions): Promise<Capture>;
};

export type RawColorCameraProps = {
  /** false → release the camera. */
  active: boolean;
  request: CaptureRequest;
  facing?: 'back' | 'front';
  /** Overlay, positioned over the shared sensor-aspect frame. App-owned. */
  children?: ReactNode;
  onCapabilities?: (caps: ResolvedCapabilities) => void;
  onError?: (e: Error) => void;
  style?: StyleProp<ViewStyle>;
};
