# Progress — Grovekeeper

> Updated 2026-04-24 as part of the RC redesign doc-cleanup wave.

## Where we are

Mid-redesign. The 1.0.0-alpha.1 BabylonJS build is deployed but is being
replaced by the RC redesign per
`docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`.

The redesign target is a third-person voxel game on Jolly Pixel
(`@jolly-pixel/engine` + `voxel.renderer` + `runtime`) with biome-typed
chunk-streamed outer worlds and the special peaceful Grove biome that the
player discovers, claims via hearth, and uses as a fast-travel network.

Active branch: `release/workflows-v2`.

## Wave-by-wave status

| # | Wave | Status |
|---|------|--------|
| 1 | Doc cleanup | IN PROGRESS — this commit |
| 2 | Asset inventory | pending |
| 3 | Asset pipeline | pending |
| 4 | Persistence (drizzle + Capacitor SQLite + Preferences) | pending |
| 5 | Audio (drop Tone.js, engine audio stack) | pending |
| 6 | Engine port scaffold | pending |
| 7 | Tileset generation | pending |
| 8 | Voxel terrain | pending |
| 9 | Biome registry | pending |
| 10 | Chunk streaming | pending |
| 11 | Grove biome | pending |
| 12 | Grove Spirit + NPCs | pending |
| 13 | Crafting + Building | pending |
| 14 | Hearth + claim | pending |
| 15 | Outer-world fauna | pending |
| 16 | Combat | pending |
| 17 | Resource gathering | pending |
| 18 | Journey | pending |
| 19 | Verification | pending |
| 20 | Polish | pending |

Detailed wave acceptance criteria live in the spec linked above and the
implementation plan that follows from it. Single-source live status is
in `docs/STATE.md`.

## What is done in the deployed build (BabylonJS, being deleted)

For reference only — these are all going away in the engine port wave:

- BabylonJS scene managers (`SceneManager`, `CameraManager`,
  `GroundBuilder`, `LightingManager`, `SkyManager`, `PlayerMeshManager`,
  `TreeMeshManager`, `BorderTreeManager`, `BlockMeshFactory`).
- SPS procedural tree generator + `treeMeshBuilder`.
- 9-zone JSON world (`src/world-data/data/starting-world.json`).
- A* tap-to-move pathfinding (`pathfinding.ts`, `pathFollowing.ts`).
- 2.5D orthographic diorama camera.
- Tone.js synthesized audio.
- `FarmerMascot` SVG.

## What survives the port (pure logic, re-wires effects)

- Tree growth lifecycle (`growth.ts`)
- Weather (`weather.ts`) — visuals re-implemented as voxel particle layer
- Time / day-night (`time.ts`)
- Stamina (`stamina.ts`)
- Harvest (`harvest.ts`)
- Save / load — drizzle schema extended for chunks/biomes/groves/claim/
  inventory/recipes-known/dialogue history
- Achievements / discovery / recipes — kept where they survive the
  design contact in `docs/DESIGN.md`

## Success criteria for RC

1. All 16 screenshot gates in `docs/rc-journey/` committed and matching
   Playwright baselines.
2. Every surface ≥ 10/12 on the rubric.
3. Lighthouse landing performance ≥ 90 mobile.
4. FPS budgets hit per-biome.
5. Bundle and asset budgets met.
6. Internal docs describe the actual game.
7. **A new player can play through the journey to second-grove discovery
   without ever reading a tutorial popup, and emerge with the meta-loop
   (gather → craft → build → claim → arm → wander → fight → discover) in
   their head.**
