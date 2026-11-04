# Follow-up: reference card on the color results screen

Status: **not implemented** — deferred follow-up. The current branch
(`feat/color-add-whibal-and-gray`) adds a reference-card picker to the **Photo
Analysis** screen (`ColorAnalysisHomeScreen`), but the choice is transient and
the **soil color results screen** (`ColorScreen`, showing e.g. "5Y 8/4") neither
shows nor lets you change which reference was used.

## The gap

The reference type is local component state on `ColorAnalysisHomeScreen`, used
once for the analysis and then discarded when the flow pops back. So after
analysis you can't see or edit it.

## Options considered

1. **Show, read-only** — display which reference was used on the results
   screen. Needs the chosen `referenceType` persisted. Provenance only.
2. **Editable + recalculate** *(preferred)* — let the user change the reference
   on the results screen; the Munsell color recomputes on change.

## Key insight: Option 2 does NOT need the images or crop coordinates

The corrected color is a pure function of three things:

```
correctSampleRGB( dominantColor(cardPixels),   // reference card's dominant RGB
                  dominantColor(soilPixels),    // soil sample's dominant RGB
                  REFERENCES[referenceType] )    // the chosen reference's RGB
   → rgb255ToMhvc → nearest Munsell
```

(see `src/model/color/colorDetection.ts`: `getColorFromPixels` /
`predictColorFromReference` / `correctSampleRGB`.)

The two dominant RGBs are **reference-independent** — they're computed once from
the captured images during analysis. So to recompute for a *different*
reference you only need to persist:

| Persist | Size | Enables |
| --- | --- | --- |
| `referenceType` | 1 enum | Option 1 (display) |
| + card-dominant RGB, soil-dominant RGB | 6 floats | **Option 2** — instant, offline recalc |

You do **not** need to retain the photos or crop rects. Changing the reference
just re-runs `correctSampleRGB` on the stored dominants → new Munsell,
instantly, no image decode. (Dominants are algorithm-independent, so this stays
correct even if `correctSampleRGB` / the Munsell mapping changes later.)

## What is persisted today

Nothing about the capture. `CropResult = { photo: PhotoWithBase64; crop: Crop }`
lives only in the `ColorAnalysis` context state and is dropped on pop. Only the
final `colorHue/colorValue/colorChroma` and the `colorPhoto*` condition flags
are written to soil data (and synced). So image + coordinates are **not** saved.

## Open decision: where the persisted values live

- **Synced soil-data model** (add `referenceType` + 2 dominant RGBs): durable,
  cross-device, but adds backend schema surface and syncs raw dominants.
- **Local (device-only) slice** keyed by site/depth: zero backend change, but
  editability is lost on reinstall / other devices.

For "tweak the reference later," local-only is probably acceptable. Decide
before implementing.

## Implementation sketch (Option 2)

1. In `colorDetection.ts`, expose the two dominant RGBs from analysis (return
   them alongside the color result, or add a helper that recomputes a
   `ColorResult` from two dominants + a `ReferenceType`).
2. Persist `{ referenceType, cardDominantRgb, soilDominantRgb }` when a color is
   accepted (location per the decision above).
3. On the results screen (`ColorScreen`), render a reference `Select`/`RadioBlock`
   seeded from the persisted `referenceType`; on change, recompute the Munsell
   from the stored dominants and dispatch the updated color.
4. Handle the "unexpected color" (nearest-valid vs invalid) path the same way
   `ColorAnalysisHomeScreen` does today.
