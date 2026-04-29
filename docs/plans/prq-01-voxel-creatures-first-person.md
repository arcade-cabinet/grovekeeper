---
title: PRQ-01 — Voxel Creatures + First-Person Camera
priority: P0
status: pending
updated: 2026-04-29
blocks: []
blocked_by: []
---

# PRQ-01: Voxel Creatures + First-Person Camera

## Goal

Replace the GLB ModelRenderer pipeline for creatures and the Gardener
with a pure-VoxelRenderer approach. Switch the camera to first-person.
The Gardener player character is removed. Creatures are voxel assemblies
animated via per-limb layer translation.

## Spec reference

`docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`
— sections "Rendering architecture", "First-person camera".

## Success criteria

1. Camera is first-person (`Camera3DControls` native mode; no
   `CameraFollowBehavior`).
2. All `ModelRenderer` imports removed from non-test production code.
3. At least one creature type (wolf or equivalent hostile) renders as a
   VoxelRenderer multi-layer assembly with idle + walk animation.
4. At least one peaceful creature (rabbit or equivalent) renders as a
   VoxelRenderer assembly with wander animation.
5. Grove Spirit renders as a voxel assembly (bioluminescent-vine-block,
   heartwood-block, spore-block); oscillates via translateLayer; no
   dialogue system.
6. NPC villagers render as minimal voxel assemblies (3–4 blocks).
7. All tests pass. TypeScript clean. Biome lint clean.
8. Screenshot gates re-baselined after visual changes.

## Task breakdown

### T1: Switch camera to first-person
- Remove `CameraFollowBehavior` from runtime.
- Configure `Camera3DControls` for first-person: eye height 1.6 units,
  mouse-look desktop, touch-drag mobile.
- Remove `PlayerActor` (no more Gardener GLB).
- Player position is now the camera position directly.
- Input `move` still translates camera position; swing/interact still
  fire from camera forward vector.
- Update `src/game/scene/runtime.ts`, remove `PlayerActor` wiring.
- Update `src/game/scene/index.ts` exports.
- Test: camera spawns at world origin at eye height; move input
  translates position.

### T2: VoxelCreatureActor base class
- `src/game/scene/VoxelCreatureActor.ts` — `ActorComponent` subclass.
- Takes a layer manifest: `{ partName: string, voxels: VoxelEntry[] }[]`.
- On `awake`, creates one named VoxelLayer per part, sets initial voxels.
- Exposes `setPose(pose: Partial<Record<string, VoxelCoord>>)` to
  translate named layers (the animation driver calls this each frame).
- On despawn, removes all owned layers from VoxelWorld.
- Unit test: layer creation + cleanup.

### T3: Wolf creature (hostile)
- Voxel palette: meadow-grey stone blocks for body, dark-stone for
  paws. 6 parts: `body`, `head`, `left-front-leg`, `right-front-leg`,
  `left-back-leg`, `right-back-leg`.
- Animation clips (pure math, no keyframes):
  - `idle`: head bobs ±0.02 units at 0.8 Hz
  - `walk`: legs alternate in-phase at 1.5 Hz, ±0.12 units Y
  - `charge`: legs at 3 Hz, body tilts forward 0.1 units Z
- `WolfActor.ts` extends `VoxelCreatureActor`.
- AI state machine: `idle → alert → chase → attack → flee`.
- Unit test: state machine transitions.

### T4: Rabbit creature (peaceful)
- 3 parts: `body`, `head`, `ears` (single layer, both ears as one block row).
- Wander AI: picks random XZ target within 8 units, walks there, idles.
- Flees when player within 4 units.
- Unit test: wander + flee state.

### T5: Grove Spirit voxel assembly
- Remove `GroveSpiritActor` GLB rendering code.
- Replace with `GroveSpiritVoxelActor.ts`:
  - Two layers: `spirit-lower` (base, static), `spirit-upper` (torso+head,
    oscillates via translateLayer at 0.3 Hz, ±0.08 Y).
  - Block types: `bioluminescent-vine-block` (emissive #8fff8f, alpha 0.7),
    `heartwood-block` (#c87a3a), `spore-block` (semi-transparent, drifts).
  - No dialogue attachment.
  - Glow intensification on claim: emissive value ramps 0.7 → 1.0 over 2s.
- Register the three spirit-specific block types in blockRegistry.
- Unit test: assembly + glow ramp.

### T6: NPC villager voxel assemblies
- Remove GLB villager rendering.
- `VillagerActor.ts` — 4-block assembly: `body`, `head`, `left-arm`,
  `right-arm`.
- Block types drawn from grove palette (flowering-grass-block,
  warm-stone-block).
- Idle animation: arms sway ±0.05 at 0.6 Hz.
- Unit test: assembly construction.

### T7: Remove ModelRenderer dependency
- `grep -r "ModelRenderer" src/ --include="*.ts" --include="*.tsx" -l`
- For each file: remove import, remove usage.
- `grep -r "@jolly-pixel/engine" src/ --include="*.ts"` — confirm only
  `Actor`, `ActorComponent`, and engine ECS types remain; no renderer
  types.
- `pnpm tsc` must be clean.

### T8: Re-baseline screenshot gates
- Run `pnpm test:rc-journey` with `UPDATE_SNAPSHOTS=1` to re-capture
  all 16 gates under the new visual.
- Commit new baselines.
- Re-run without flag to confirm all pass.

## Notes

- Layer naming convention: `{entityId}-{partName}` — entity IDs from
  Koota UUID or a simple incrementing integer.
- `translateLayer` marks all chunks in all layers dirty. Creatures should
  use dedicated VoxelWorld instances or a careful layer isolation strategy
  to avoid forcing full-world dirty on each animation tick. Consider one
  VoxelRenderer per creature Actor with its own small VoxelWorld.
- Spore-block "drift" is a per-frame translateLayer on the spore layer
  with small positive Y delta, wrapping when offset exceeds 1 unit.
