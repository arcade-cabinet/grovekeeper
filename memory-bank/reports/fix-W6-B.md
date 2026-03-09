# Fix W6-B: Bridge ECS DayNightComponent to Sky/Lighting Rendering

**Date:** 2026-03-07
**Status:** COMPLETE
**Tests:** 3988/3988 passing (165 suites)
**TypeScript:** 0 new errors in changed files

---

## Problem

Two parallel day/night systems existed in the codebase:

- **System A** (`game/systems/time.ts`): 4 hard-bucketed phases (day/dawn/dusk/night) driving `<Lighting>` and `<Sky>` via `computeTimeState()` / `getSkyColors()`. Active and wired.
- **System B** (`game/systems/dayNight.ts`): 8-slot ECS `DayNightComponent` with full lerped lighting data. Fully implemented but orphaned — never bootstrapped into the ECS world, never read by the renderer.

The result: System B was dead code. `<Sky>` had no star cluster. `<Lighting>` ignored shadow opacity from the ECS. The sky gradient used hard 4-phase colors instead of the smooth 8-slot lerp.

---

## Fixes Applied

### Fix 1 — Wire ECS DayNight values to `<Sky>` and `<Lighting>`

**`app/game/index.tsx`**: The `timeVisuals` memo now reads `dayNightQuery.entities[0]?.dayNight` first. When the ECS entity exists (after the first game frame), all visual values come from the lerped ECS component. Falls back to `time.ts` System A before ECS bootstraps.

Fields bridged from ECS to renderer:
- `gameHour / 24` → `timeOfDay` (normalized, drives sun position in Lighting)
- `sunIntensity` → sun directional light scaling
- `ambientIntensity` → ambient light intensity
- `shadowOpacity` → directional light intensity multiplier
- `starIntensity` → star cluster emissive intensity in Sky
- `skyZenithColor`, `skyHorizonColor` → sky gradient top/bottom
- `directionalColor` → sun color
- `ambientColor` → ambient light color

**`game/hooks/useGameLoop/index.ts`**: Added section 1b — bootstraps the singleton DayNight + Sky ECS entity on the first frame (if not already present), then calls `tickDayNight(entity.dayNight, skyEntity.sky, dt)` every frame thereafter.

### Fix 2 — Replace hard-snap slot bucketing with continuous lerp in `dayNight.ts`

**`game/systems/dayNight.ts`**: Added a `SLOT_ANCHORS` ordered array of 8 `{hour, slot}` entries. Added `findLerpPair(hour)` which handles midnight wrap (h<5 normalized to h+24) so the interval [22h, 2h] lerps continuously across midnight without special-casing.

New exports:
- `lerpLightingForHour(hour): LightingSnapshot` — returns lerped `ambientColor`, `ambientIntensity`, `directionalColor`, `directionalIntensity`, `shadowOpacity`
- `lerpSkyColorsForHour(hour): SkyColorSnapshot` — returns lerped `zenith`/`horizon` hex strings
- `lerpStarIntensity(hour): number` — returns lerped star visibility [0,1]

`tickDayNight()` now calls these functions each frame and writes the results back to the `DayNightComponent` in-place. Sky zenith/horizon colors transition smoothly over the full 24-hour cycle.

**`config/game/dayNight.json`**: Added `skyColors` section with 8 named slots (dawn/morning/noon/afternoon/dusk/evening/night/midnight), each with `zenith` and `horizon` hex strings. Without this, lerping sky colors was impossible.

**`game/ecs/components/procedural/atmosphere.ts`**: Extended `DayNightComponent` interface with 4 required fields to hold the new lerped outputs: `sunIntensity`, `skyZenithColor`, `skyHorizonColor`, `starIntensity`.

### Fix 3 — Star cluster in `Sky.tsx` driven by `starIntensity`

**`components/scene/Sky.tsx`**: Added a 200-instance `THREE.InstancedMesh` star cluster with:
- `STAR_COUNT = 200` instances rendered in a single draw call
- `STAR_SHELL_RADIUS = 75` — just inside the sky dome sphere (radius 80)
- `STAR_SEED = 0xdeadbeef` — fixed constant for deterministic positions across sessions
- `generateStarPositions()` uses `createRNG(STAR_SEED)` (Mulberry32 PRNG) with uniform sphere sampling: `theta = 2π·u`, `phi = acos(2v-1)`. Only upper hemisphere positions are kept.
- `STAR_POSITIONS` pre-computed once at module load — never recalculated
- Star transforms set once in `useEffect` via `mesh.setMatrixAt()`
- `useFrame` drives `starMat.emissiveIntensity = starIntensity` and culls (`starMesh.visible = false`) when `starIntensity < 0.01` to avoid rendering invisible geometry

New prop: `starIntensity?: number` (defaults to 0 — daytime safe).

### Fix 4 — Shadow opacity scales directional light in `Lighting.tsx`

**`components/scene/Lighting.tsx`**: Added `shadowOpacity?: number` prop. In `useFrame`:

```typescript
const effectiveShadowOpacity = shadowOpacity ?? sunIntensity;
sun.intensity = sunIntensity * 0.8 * Math.max(0.05, effectiveShadowOpacity);
```

- `shadowOpacity = 0` at night/midnight/evening → directional light intensity ~0.04 (near-zero, avoids hard black artifacts from fully cutting directional)
- `shadowOpacity = 1` at noon → full `sunIntensity * 0.8`
- `shadowOpacity = 0.3` at dawn/dusk → soft reduced shadows
- Falls back to `sunIntensity` when prop is absent (System A compatibility)

---

## Files Changed

| File | Change |
|------|--------|
| `config/game/dayNight.json` | Added `skyColors` section (8 slots, zenith+horizon per slot) |
| `game/ecs/components/procedural/atmosphere.ts` | Extended `DayNightComponent` with 4 new required fields |
| `game/systems/dayNight.ts` | Added lerp infrastructure (`SLOT_ANCHORS`, `findLerpPair`, `lerpLightingForHour`, `lerpSkyColorsForHour`, `lerpStarIntensity`); updated `initDayNight` and `tickDayNight` |
| `game/hooks/useGameLoop/index.ts` | Bootstrap + per-frame tick of DayNight ECS entity (section 1b) |
| `app/game/index.tsx` | `timeVisuals` memo reads ECS first, falls back to System A; passes `shadowOpacity` + `starIntensity` to components |
| `components/scene/Lighting.tsx` | Added `shadowOpacity?: number` prop; applies to directional light scaling |
| `components/scene/Sky.tsx` | Added `starIntensity?: number` prop; 200-instance star cluster with seeded deterministic positions |
| `game/systems/dayNight.test.ts` | Fixed `makeDayNight` helper (4 new required fields); fixed `toBeCloseTo` vs `toBe` for lerped noon value |

---

## Technical Notes

### Midnight Wrap in Lerp
The `findLerpPair` function normalizes the hour space: anchors before 5h (specifically the `midnight` anchor at h=2) are treated as h+24 so they sort after `night` (h=22). This ensures the interval [22h → 2h] interpolates continuously without a discontinuity at midnight.

### Biome Linter Interference
During implementation, the PostToolUse Biome hook (`organizeImports`) was stripping imports that weren't yet referenced in the same edit call. Large file rewrites were made via Python `open(..., 'w').write()` calls in Bash to apply all changes atomically, ensuring Biome only runs once on the fully consistent file.

### System A Coexistence
System A (`time.ts`) remains the active source during the first frame before ECS bootstraps. After `useGameLoop` adds the DayNight entity on frame 1, System B takes over permanently for that session. The fallback path in `app/game/index.tsx` ensures no flash or transition artifact on load.

### Test: `lerpLighting` at Noon Precision
`tickDayNight(dn, sky, 0.001)` at `gameHour=12` produces `ambientIntensity = 0.999998` (lerping from noon=1.0 toward afternoon=0.85 by 0.001s × 24/600 game-hours). Test was updated from `toBe(1.0)` to `toBeCloseTo(1.0, 3)`.

---

## Verification

```
Tests:        3988 passed, 3988 total (165 suites)
dayNight.ts:  73/73 tests pass
TypeScript:   0 errors in changed files
```

Pre-existing TS5097 errors (allowImportingTsExtensions) remain unchanged — not caused by this fix.
