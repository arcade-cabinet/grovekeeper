# W5-A Water System Audit

**Date:** 2026-03-07
**Auditor:** Deep-scrutiny pass — Water System
**Scope:** Gerstner waves, water body placement, interaction (splash/buoyancy), fishing, audio, rendering wiring

---

## Summary Table

| Area | Rating | Notes |
|---|---|---|
| ECS WaterBodyComponent (data model) | REAL | All fields present and correct |
| GerstnerWaveLayer parameters | REAL | Amplitude, wavelength, speed, steepness, direction — all present |
| Gerstner vertex shader | REAL | Custom GLSL, per-layer displacement, foam accumulation |
| Foam at wave crests | REAL | `vFoam` varying drives fragment-side threshold blend |
| Caustics shader + plane | REAL | Two-layer sine interference, AdditiveBlending, separate caustic mesh |
| Water body types (ocean/river/pond/stream) | PARTIAL | River, stream, pond built; ocean missing from waterPlacer |
| Per-frame wave animation (uTime update) | REAL | `updateGerstnerTime` called from `useFrame` in WaterBodies |
| WaterBodies mounted in Canvas | MISSING | `<WaterBodies />` is NOT imported or rendered in `app/game/index.tsx` |
| waterPlacer — biome-based placement | REAL | 8 biomes, per-biome probability + type rules, seeded RNG |
| waterPlacer — flow direction for rivers | REAL | `computeFlowDirection` via central-difference gradient |
| waterPlacer wired to ChunkManager | REAL | `placeWaterBodies` called in `ChunkManager.loadChunk()` |
| Water body cleanup on chunk unload | REAL | `chunkChildEntities` map, entities removed via `world.remove` |
| Splash particles on water entry | PARTIAL | `tickWaterParticles` + `waterParticles.ts` exist but NOT called from game loop |
| Bubbles while submerged | PARTIAL | `buildBubblesEmitter` exists, same problem — not wired |
| Player movement slow in water | MISSING | No implementation found anywhere |
| Buoyancy (player floats in deep water) | MISSING | No implementation found anywhere |
| Temperature affected by water | MISSING | No implementation found anywhere |
| Fishing system — state machine | REAL | Full 6-phase state machine: idle→casting→waiting→biting→minigame→caught/escaped |
| Fishing — timing minigame | REAL | Bouncing cursor, seeded zone width, `pressFishingAction` |
| Fishing — fish species seeded per biome+season | REAL | `selectFishSpecies` + `fishing.json` with `biomeSpecies` + `seasonWeights` |
| Fishing — wired to water body raycast | PARTIAL | `actionDispatcher.ts:FISH` checks `isWaterFishable`, opens store panel — but fishing minigame UI not confirmed wired end-to-end |
| Fishing dock yield bonus | REAL | `computeFishYield(hasDock)` from config (`fishingDockYieldBonus: 0.3`) |
| Ambient water audio (AmbientZoneComponent) | REAL | `audioZonePlacer.ts` derives 1:1 zones from water placements; `tickAmbientAudio` wired in game loop |
| Tests — ECS water component | REAL | `procedural.test.ts` covers WaterBodyComponent |
| Tests — Gerstner shader | REAL | `gerstnerWater.test.ts` — uniforms, GLSL content, material creation, time updates |
| Tests — WaterBodies component | PARTIAL | Tests cover constants + `buildWaterPlaneGeometry`; useFrame loop not integration-tested |
| Tests — waterPlacer | REAL | Comprehensive: minima detection, flow direction, biome rules, seeded placement |
| Tests — fishing | REAL | Full state machine + species selection + yield + round-trip integration |
| Tests — waterParticles | REAL | `waterParticles.test.ts` exists (component tested, wiring not tested) |

---

## Detailed Findings

### 1. Gerstner Waves — REAL

**Evidence:** `game/shaders/gerstnerWater.ts`

The GLSL vertex shader implements the full Gerstner displacement formula matching GAME_SPEC.md §31.2:

```glsl
// gerstnerWater.ts:48-64
for (int i = 0; i < 8; i++) {
  float k = TWO_PI / uWavelength[i];
  float phase = dot(uDirection[i], pos.xz) * k + uTime * uSpeed[i];
  pos.x += uDirection[i].x * uSteepness[i] * uAmplitude[i] * cosP;
  pos.z += uDirection[i].y * uSteepness[i] * uAmplitude[i] * cosP;
  pos.y += uAmplitude[i] * sinP;
  foam += uSteepness[i] * max(0.0, sinP);
}
```

All four Gerstner parameters are present: `amplitude`, `wavelength` (used as `2π/wavelength` for frequency), `speed`, `steepness`, `direction[2]` — matching `GerstnerWaveLayer` at `game/ecs/components/procedural/water.ts:11-17`.

Pads to `MAX_WAVE_LAYERS=8`. Unused slots have `amplitude=0`, contributing zero displacement. `wavelength` padded to `1` (not `0`) to avoid division-by-zero — correct.

**Clock:** `WaterBody.tsx:83` — `const time = clock.elapsedTime` from R3F's `useFrame` state, updated each frame via `updateGerstnerTime(material, time)` at line 109.

---

### 2. Foam at Wave Crests — REAL

**Evidence:** `gerstnerWater.ts:58-89`

Foam is accumulated in the vertex shader as `foam += uSteepness[i] * max(0.0, sinP)` and passed to fragment as `vFoam`. The fragment shader blends toward white where `vFoam > uFoamThreshold`:

```glsl
if (uFoamEnabled && vFoam > uFoamThreshold) {
  float foamBlend = clamp((vFoam - uFoamThreshold) / 0.4, 0.0, 1.0);
  color = mix(color, vec3(1.0), foamBlend);
}
```

Default `foamThreshold` = 0.6 (spec: §31.2 default 0.6). Foam is enabled per water body (`foamEnabled: boolean` on `WaterBodyComponent`). River and ocean have `foamEnabled: true`; pond and stream do not.

---

### 3. Caustics — REAL

**Evidence:** `gerstnerWater.ts:199-259`, `WaterBody.tsx:111-131`

A separate caustic `ShaderMaterial` uses a two-layer sine interference pattern in the fragment shader with `AdditiveBlending`. The caustic plane is positioned at `position.y - CAUSTICS_DEPTH_OFFSET` (0.05 world units below the water surface) — matching "projected on terrain below surface" in spec §31.2.

Constants are spec-correct: `CAUSTICS_UV_SCALE = 0.5`, `CAUSTICS_SPEED = 0.8` (spec: "Scale 0.5, speed 0.8").

Caustics are enabled for: river, pond, stream. Disabled for: ocean. This matches the spec table at §31.2.

---

### 4. Water Body Types — PARTIAL

**Evidence:** `game/ecs/components/procedural/water.ts:8`, `game/world/waterPlacer.ts:165-228`

The ECS type supports all five types: `"ocean" | "river" | "pond" | "stream" | "waterfall"`.

However, `waterPlacer.ts` only generates `"river"`, `"stream"`, and `"pond"` — never `"ocean"` or `"waterfall"`. No ocean generation path exists anywhere in the codebase. Waterfalls are noted in the spec as "N/A (particle)" but no particle waterfall is implemented either.

The spec table at §31.2 lists ocean as having 4 wave layers and high amplitude. The ocean type is defined in `GerstnerWaveLayer` and tested in `gerstnerWater.test.ts` as a fixture (4-layer ocean water body), but that fixture is test-only — no world generator ever produces ocean ECS entities.

---

### 5. WaterBodies NOT Mounted in Canvas — MISSING (Critical)

**Evidence:** `app/game/index.tsx:1-320` (full file reviewed)

The Canvas at `app/game/index.tsx:205-234` contains:
- `<GameSystems />` (runs useGameLoop)
- `<FPSCamera />`
- `<Lighting />`
- `<Sky />`
- `<TerrainChunks />`
- `<Ground />`
- `<PlayerCapsule />`
- `<TreeInstances />`
- `<GrassInstances />`
- `<NpcMeshes />`
- `<BirmotherMesh />`

`<WaterBodies />` is absent. It is never imported or rendered anywhere in the app. The `WaterBodies` component exists at `components/scene/WaterBody.tsx`, the `waterBodiesQuery` fires from ECS, water body ECS entities are created by `ChunkManager` — but nothing renders them.

**Result:** Water bodies are present in ECS, but invisible. The entire Gerstner wave renderer is dead code from the game's perspective.

---

### 6. waterPlacer — Biome Rules — REAL

**Evidence:** `game/world/waterPlacer.ts:134-153`

All 8 biomes have defined rules. Notable correctness:
- `frozen-peaks` → `probability: 0` (no liquid water) — correct
- `wetlands` → highest probability (0.5) — correct
- `rocky-highlands` → `streamChance: 1.0` (only streams) — correct
- `meadow` → `riverChance: 0, streamChance: 0` (only ponds) — correct

Flow direction for rivers and streams computed via central-difference gradient (`computeFlowDirection`), producing a normalized `[dx, dz]` vector. The primary river wave layer has its `direction` aligned to flow: `waterPlacer.ts:181-183`.

`placeWaterBodies` is deterministic: same `worldSeed + chunkX + chunkZ + heightmap + biome` always yields the same placement. Uses `scopedRNG("water-placement", worldSeed, chunkX, chunkZ)`.

---

### 7. ChunkManager Wiring — REAL

**Evidence:** `game/world/ChunkManager.ts:377-406`

`placeWaterBodies(this.worldSeed, chunkX, chunkZ, terrainData.heightmap, biome)` is called in `loadChunk()`. Each water body placement is added to the ECS world with `waterBody` and `position` components. Entities are tracked in `chunkChildEntities` for cleanup on chunk unload.

---

### 8. Splash / Bubbles Particles — PARTIAL

**Evidence:** `game/systems/waterParticles.ts` exists and is complete. The `tickWaterParticles` function:
- Calls `detectWaterState(playerX, playerY, playerZ, waterBodies)` each tick
- Spawns a one-shot `splash` particle emitter on `above → submerged` transition
- Spawns a continuous `bubbles` emitter while submerged
- Cleans up the bubbles emitter when player exits water

**However:** `tickWaterParticles` is not called from `game/hooks/useGameLoop/index.ts` (full file reviewed — no reference). The function is pure and correct but not wired into the game loop.

Spec §31.2: "12 particles on player water entry, lifetime 0.8s." Constants come from `config/game/procedural.json` via `SPLASH_PARTICLE_COUNT` and `SPLASH_LIFETIME`. No inline magic numbers.

---

### 9. Player Movement Slow in Water — MISSING

No code found anywhere that reads `WaterBodyComponent` to slow player movement. No water-speed multiplier in `PlayerCapsule.tsx`, `useInput`, or any movement system. Spec §12 implies water affects stamina/survival in Survival mode — not found.

---

### 10. Buoyancy — MISSING

No buoyancy code found. The `detectWaterState` function in `waterParticles.ts` tracks above/submerged state based on Y position and water body footprint, but no physics force is applied. The Rapier physics body on the player is not modified based on water state.

---

### 11. Temperature / Water Immersion — MISSING

No code that reduces temperature when the player is in water. The survival stamina tick (`tickSurvival`) does not reference water state.

---

### 12. Fishing System — REAL (Logic), PARTIAL (Wiring)

**Evidence:** `game/systems/fishing.ts`, `config/game/fishing.json`

The state machine is complete and correct:
- `idle → casting → waiting → biting → minigame → caught | escaped`
- Timing bar: bouncing cursor with configurable `timingBarSpeed: 0.8`, `zoneWidth: 0.25`
- Wait duration: seeded between `minWaitDuration: 3.0` and `maxWaitDuration: 10.0` seconds
- Bite window: `biteDuration: 4.0` seconds (player must respond)

Species selection is seeded per biome+season: `selectFishSpecies(biome, season, rng)` uses weighted sampling. 8 biomes defined including magical (`twilight-glade: ["luminous-carp", "shimmer-perch"]`).

Fishing dock yield bonus: `computeFishYield(hasDock)` → `Math.ceil(baseYield * (1 + 0.3))` — matches Spec §18.1 and §22.

**Wiring gap:** The action dispatcher (`actionDispatcher.ts:271-283`) handles `FISH` by calling `store.setActiveCraftingStation({ type: "fishing", entityId })`. This opens a UI panel. However:
1. No fishing minigame UI component found in the codebase (the `FishingPanel` or equivalent was not located)
2. `tickFishing` is not called from any game loop — the state machine is not driven per-frame
3. Fish species selection result is not connected to inventory

The fishing logic is a working pure library but the integration layer (UI + per-frame tick + inventory grant) is absent.

---

### 13. Ambient Water Audio — REAL

**Evidence:** `game/world/audioZonePlacer.ts`, `game/hooks/useGameLoop/index.ts:161-188`

`placeAudioZones(waterPlacements)` creates one `SoundscapeComponent` entity per water body with `soundscape: "water"`, radius derived from `max(width, depth) × 1.5` (from `config/game/procedural.json`), volume from config.

The game loop at `index.ts:174-188` collects all `ambientZone` entities, builds `ZoneInput[]`, and calls `tickAmbientAudio`. Water ambient audio is correctly wired to the game loop. This is the most complete and properly wired water sub-system.

---

### 14. Tests

| File | Coverage | Notes |
|---|---|---|
| `game/shaders/gerstnerWater.test.ts` | REAL | Uniforms, GLSL content, material creation, time updates, caustics constants |
| `components/scene/WaterBody.test.ts` | PARTIAL | `buildWaterPlaneGeometry` + constants tested; useFrame imperative loop is mocked out entirely |
| `game/world/waterPlacer.test.ts` | REAL | `findLocalMinima`, `computeFlowDirection`, `getBiomeWaterRule`, `selectWaterType`, `placeWaterBodies` |
| `game/systems/fishing.test.ts` | REAL | All phases, cursor bounce, species selection, yield, round-trip integration |
| `game/systems/waterParticles.test.ts` | REAL | `detectWaterState`, `buildSplashEmitter`, `buildBubblesEmitter`, `tickWaterParticles` |

No test covers the Canvas mounting of `WaterBodies`, the fishing UI, or the `tickWaterParticles` call in the game loop (because neither exists).

---

## Verdict Summary

| Concern | Verdict |
|---|---|
| GerstnerWaveLayer — all 4 parameters (amplitude, frequency, steepness, direction) | REAL |
| WaterBody.tsx uses custom Gerstner ShaderMaterial | REAL |
| Wave parameters animated per-frame via clock.elapsedTime | REAL |
| Foam at wave crests via steepness threshold | REAL |
| Caustics — animated, AdditiveBlending, correct scale/speed | REAL |
| Ocean type — spec-defined but never generated | PARTIAL |
| Waterfall type — spec-defined, no particle implementation | MISSING |
| Biome-based water placement (rivers in forest, ponds in meadow, etc.) | REAL |
| Water bodies as actual geometry with wave shader | REAL |
| WaterBodies mounted and visible in game | MISSING |
| Splash particles on water entry | PARTIAL (system exists, not wired) |
| Bubbles while submerged | PARTIAL (system exists, not wired) |
| Player movement slow in water | MISSING |
| Buoyancy | MISSING |
| Temperature affected by water | MISSING |
| Fishing — state machine + timing mechanic | REAL |
| Fishing — species seeded per water body | REAL |
| Fishing — wired to water body via raycast + actionDispatcher | PARTIAL |
| Fishing — minigame UI + per-frame tick | MISSING |
| Ambient water audio via AmbientZoneComponent | REAL |

---

## Key Gaps (Priority Order)

1. **`<WaterBodies />` not mounted** (`app/game/index.tsx`) — The entire visual water system is built but invisible. Single import + JSX line needed.

2. **`tickWaterParticles` not called** (`game/hooks/useGameLoop/index.ts`) — Splash and bubble particles are fully implemented but dead. Needs wiring: collect `waterBodiesQuery` entities, call `tickWaterParticles` each frame.

3. **Fishing minigame UI not found** — The `fishing.ts` state machine has no UI consumer. `store.setActiveCraftingStation({ type: "fishing" })` is set but no component reacts to `type: "fishing"` to render the timing bar.

4. **`tickFishing` not called per frame** — Even if UI existed, the state machine is not driven. Needs a `useRef<FishingState>` + `tickFishing(state, dt)` in the game loop or a fishing-specific hook.

5. **Ocean type never generated** — `waterPlacer.ts` only generates river/stream/pond. Ocean is defined in the ECS type and has dedicated shader fixtures in tests, but no biome rule produces it.

6. **Movement/physics interactions absent** — Player velocity is not reduced in water, buoyancy is not applied, temperature is not drained. These are survival-mode features (Spec §12) with no implementation.
