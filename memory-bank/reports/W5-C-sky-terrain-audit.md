# W5-C: Sky, Terrain, Heightmap & Atmosphere Audit

**Auditor:** Deep-scrutiny domain audit (sky / terrain / heightmap / atmosphere)
**Date:** 2026-03-07
**Branch:** feat/expo-migration

---

## Files Examined

| File | Purpose |
|------|---------|
| `components/scene/Sky.tsx` | Sky sphere + shader |
| `components/scene/Ground.tsx` | Ground plane (flat fallback) |
| `components/scene/TerrainChunk.tsx` | Per-chunk terrain mesh + Rapier collider |
| `components/scene/Lighting.tsx` | Ambient + directional light + fog |
| `game/systems/dayNight.ts` | Day/night tick: game hour, sun angle, star intensity |
| `game/systems/time.ts` | Microsecond clock, phase, sky colors, light intensity |
| `game/systems/weather.ts` | Weather events (roll, duration, multipliers) |
| `game/world/terrainGenerator.ts` | Heightmap generation (noise) |
| `game/world/biomeMapper.ts` | Biome assignment from temperature+moisture |
| `game/world/ChunkManager.ts` (partial) | Chunk generation, biome blending wiring |
| `game/ecs/components/procedural/atmosphere.ts` | SkyComponent, DayNightComponent, WeatherComponent, FogVolumeComponent |
| `game/ecs/components/procedural/terrain.ts` | TerrainChunkComponent, PathSegmentComponent |
| `game/utils/seededNoise.ts` | Perlin, fBm, ridged, domain warp |
| `config/game/dayNight.json` | Day length, time slots, lighting stops, star intensities |
| `app/game/index.tsx` | Scene wiring: Sky/Lighting/TerrainChunks props |
| `docs/GAME_SPEC.md` §5.2, §5.3, §17.3, §31.1, §31.3, §31.4 | Design targets |
| `docs/plans/2026-03-07-unified-game-design.md` §10 | Atmosphere design |

---

## 1. SKY

### 1.1 Sky Implementation

**Verdict: PARTIAL**

The sky is a custom `ShaderMaterial` on a sphere (radius 80, `BackSide`). It produces a smooth
zenith-to-horizon gradient with a seasonal tint (5% blend) and an intensity multiplier for day/night.

**What is real:**
- `Sky.tsx:91–125` — custom GLSL vertex/fragment shader; zenith↔horizon lerp via smoothstep (`t*t*(3-2*t)`).
- Seasonal tint: four `THREE.Color` values (`springGreen`, `summerYellow`, `autumnOrange`, `winterBlue`) from `theme.json` — applied as a 5% overlay tint to the gradient (`Sky.tsx:118`).
- Intensity: linearly maps `sunIntensity` [0,1] → `[0.15, 1.0]` (`Sky.tsx:62–63, 87–88`).
- `AccessibilityInfo.isReduceMotionEnabled()` wires `prefers-reduced-motion` to skip seasonal tint animation (`Sky.tsx:46–51`).
- `useFrame` polls `skyColors.zenith/horizon` and `sunIntensity` every frame.

**What is NOT implemented:**
- **No Preetham/drei `<Sky>` component.** Custom shader only — that is intentional per the design doc ("ShaderMaterial with 8-stop gradient interpolation, procedural cloud noise").
- **No 8-stop gradient.** The shader only has 2 color stops (zenith + horizon). The spec calls for "8-stop gradient interpolation" (`GAME_SPEC.md §5.3`). The design doc confirms the full intent. Only 2 stops are wired.
- **No star layer.** `SkyComponent.starIntensity` is computed by `tickDayNight()` (`dayNight.ts:177`) and stored in the ECS component — but there is no star mesh, instanced points, or shader pass rendering stars. `starIntensity` is orphaned: computed and stored but never consumed by any rendered component.
- **No moon.** `SkyComponent.moonPhase` (0–7) and `SkyComponent.sunAzimuth` exist as ECS fields (`atmosphere.ts:19`), but neither is rendered or animated.
- **No procedural cloud noise.** `SkyComponent.cloudCoverage` and `cloudSpeed` exist as ECS fields (`atmosphere.ts:21–23`) but are not written to by any system and not rendered. The design doc explicitly calls for "procedural cloud noise in horizon band".
- **Sky does not respond to weather.** When `weatherType` is `"rain"` or `"thunderstorm"`, the sky shader receives no different input. Cloud coverage and storm-sky darkening are unimplemented.

**Sky color source mismatch:** The game screen (`app/game/index.tsx:182–197`) derives sky colors from `getSkyColors(dayProgress)` in `game/systems/time.ts`, which returns **4 discrete phase buckets** (dawn/day/dusk/night) with hard-coded hex colors (`time.ts:55–60`). This is a different and simpler system than the 8-stop gradient + `dayNightConfig.lighting` per-slot system in `game/systems/dayNight.ts`. The two day/night systems exist in parallel:
- `time.ts` drives `<Lighting>` and `<Sky>` in the game screen.
- `dayNight.ts` drives the ECS `DayNightComponent`/`SkyComponent` — which are **not** read by any rendered component.

This means the ECS-driven day/night cycle (proper 8 time slots with correct colors, shadow opacity, star intensity) has no rendering path.

---

### 1.2 Sky Color Quality (time.ts vs dayNight.json)

| What | time.ts (actual) | dayNight.json (specced) |
|------|-----------------|------------------------|
| Phases | 4 (night/dawn/day/dusk) | 8 (dawn, morning, noon, afternoon, dusk, evening, night, midnight) |
| Color source | Hard-coded hex in JS | Config JSON with per-slot zenith + ambient |
| Gradient stops | 2 (zenith + horizon) | 8-stop (spec §5.3) |
| Transition | Hard snap per phase | Should lerp between stops |

The 4-phase `time.ts` approach produces noticeable color snaps rather than the smooth 8-stop gradient the spec calls for.

---

## 2. TERRAIN

### 2.1 Heightmap Generation

**Verdict: REAL** (with a caveat on noise mode selection)

`terrainGenerator.ts` generates a `Float32Array` of `CHUNK_SIZE * CHUNK_SIZE` values via:

```ts
// terrainGenerator.ts:38
heightmap[z * CHUNK_SIZE + x] = noise.fbm(gx, gz, 4, 2.0, 0.5);
```

- Uses global world-space coordinates (`gx = (chunkX * CHUNK_SIZE + x) * 0.05`) — chunk boundary seamlessness is guaranteed (`terrainGenerator.ts:36–38`).
- `SeededNoise` class implements **fBm, ridged multifractal, and domain warping** (`seededNoise.ts:106, 130, 159`), all tested.
- The heightmap is always regenerated from the same seed + coords (pure function) — correct for delta-only persistence.
- **Caveat:** Terrain generation uses only `noise.fbm()` with 4 octaves. The spec says "Perlin + fBm + ridged multifractal + domain warping" (`GAME_SPEC.md §31.1`). Only fBm is applied. `ridged()` and `domainWarp()` are implemented and tested but are **not called** by `generateHeightmap`. The terrain noise is thus less varied than specified.

### 2.2 Heightmap Caching

**Verdict: PARTIAL**

Terrain geometry is cached per chunk entity by ID in `TerrainChunks` (`TerrainChunk.tsx:253–295`). The `dirty` flag on `TerrainChunkComponent` triggers regeneration. However, the raw `Float32Array` heightmap is re-fetched from the ECS component each time geometry is built — there is no separate in-memory heightmap cache. Heightmaps are regenerated whenever a chunk's entity is created by `ChunkManager` (which calls `generateHeightmap()` once and stores it in the component). So the `Float32Array` lives on the ECS entity — that is correct.

### 2.3 Vertex Colors & Biome Blending

**Verdict: REAL**

- `buildTerrainGeometry()` (`TerrainChunk.tsx:120–195`) writes per-vertex RGB colors via `computeBlendedColor()`.
- Biome blending uses an 8-tile proximity zone (`BLEND_ZONE = 8` at `TerrainChunk.tsx:27`), matching `GAME_SPEC.md §17.3`: "Biome transitions blend over ~8 tiles."
- Each chunk carries `biomeBlend [N,E,S,W]` and `neighborColors [N,E,S,W]` from `ChunkManager`, and the vertex shader blends continuously across the edge zone.
- `MeshStandardMaterial` uses `vertexColors: true` and `flatShading: true` for PSX aesthetic (`TerrainChunk.tsx:300–305`).
- Tests in `biomeBlending.test.ts` and `TerrainChunk.test.ts` verify correctness.

### 2.4 Rapier Trimesh Collider

**Verdict: REAL**

`buildTrimeshArgs()` (`TerrainChunk.tsx:205–240`) produces the same vertex layout as `buildTerrainGeometry()` — both use `heightmap[vi] * HEIGHT_SCALE` — so physics mesh and visual mesh are identical. The `TerrainChunks` component creates a `RigidBodyDesc.fixed()` + `ColliderDesc.trimesh()` per chunk (`TerrainChunk.tsx:325–335`). Colliders are destroyed when chunks unload (`TerrainChunk.tsx:351–354`).

### 2.5 Terrain LOD

**Verdict: MISSING**

There is no LOD system for terrain. All chunks use identical `CHUNK_SIZE×CHUNK_SIZE` vertex density regardless of camera distance. The design doc mentions `<30K visible vertices` as a budget target — with 3×3 active chunks × 16×16 = 2,304 vertices per chunk × 9 = ~20,736 vertices — this is inside budget at the current scale, so LOD may not be urgently needed, but it is not implemented.

### 2.6 Texture Splatmaps

**Verdict: N/A (by design)**

Vertex colors are used, not texture splatmaps. This is consistent with the PSX aesthetic (`CLAUDE.md: flatShading, nearest filter`).

---

## 3. ATMOSPHERE / FOG

### 3.1 Fog Implementation

**Verdict: PARTIAL**

**What is real:**
- `Lighting.tsx:64–79` sets `scene.fog` to a `THREE.Fog` (linear fog) with near=20, far=40. The fog color is derived each frame by mixing `FOG_BASE` (earthy green `[0.3, 0.42, 0.25]`) with a 12%/10%/8% tint from the sky zenith color. The scene background is matched to fog color for seamless horizon blending.
- This creates a consistent ground-level atmospheric perspective effect.

**What is NOT implemented:**
- **No `FogVolumeComponent` rendering.** The component is defined (`atmosphere.ts:77–88`), the ECS query exists (`world.ts:209`: `fogVolumesQuery`), and the component is type-checked (`procedural.test.ts:224–241`). But no system reads `fogVolumesQuery` to apply localized fog volumes. The spec calls for fog volumes in "swamps, valleys, caves" (`GAME_SPEC.md §31.4`).
- **No exponential fog.** `THREE.FogExp2` is never used — only linear `THREE.Fog`. This means fog does not have the natural depth exponential curve.
- **Weather does not affect fog density.** When `weatherType` is `"fog"` or `"rain"`, the fog near/far values and color do not change. The spec states fog weather type should drive `FogVolumeComponent` activity.
- **No fog-sky color coherence beyond zenith tint.** During nighttime (zenith color dark blue), the fog calculation using `zenithColor.r * 0.12` produces a near-zero adjustment, making night fog nearly the same as day fog.

### 3.2 Weather & Sky Visual Integration

**Verdict: MISSING**

The weather system (`weather.ts`) tracks `WeatherType` as `"clear" | "rain" | "drought" | "windstorm"` — it does not include `"fog"`, `"snow"`, or `"thunderstorm"` which are in the ECS `WeatherComponent`. The ECS weather types and the gameplay weather types are **two separate type hierarchies that are not connected**:
- `game/systems/weather.ts`: `"clear" | "rain" | "drought" | "windstorm"`
- `game/ecs/components/procedural/atmosphere.ts` `WeatherType`: `"clear" | "rain" | "snow" | "fog" | "windstorm" | "thunderstorm"`

Neither weather system modifies sky appearance (cloud coverage, darkening, storm tint). The thunderstorm lightning flash (directional light pulse) described in `GAME_SPEC.md §31.4` is not implemented.

---

## 4. LIGHTING

### 4.1 Directional Light (Sun)

**Verdict: REAL** (but with a wiring flaw)

`Lighting.tsx:54–56` rotates the sun direction each frame:

```ts
const sunAngle = (hours / 24) * Math.PI * 2 - Math.PI / 2;
sun.position.set(-Math.cos(sunAngle) * 10, 10, -Math.sin(sunAngle) * 6);
```

The `hours` value is read from `scene.userData.gameHours` (`Lighting.tsx:54`). However, in `app/game/index.tsx`, `scene.userData.gameHours` is **never set** — nothing writes to it. The sun therefore always reads `hours = 12` (the default `?? 12`), staying fixed at its initial position. The sun does not actually orbit.

The directional light intensity and color are correctly wired via props (`sunIntensity`, `skyColors.sun`) from `timeVisuals` which does advance with game time.

### 4.2 Shadow Map

**Verdict: REAL**

`Lighting.tsx:86–100` declares:
```tsx
<directionalLight castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
  shadow-camera-near={0.5} shadow-camera-far={50}
  shadow-camera-left={-15} shadow-camera-right={15}
  shadow-camera-top={15} shadow-camera-bottom={-15} />
```
`<Canvas shadows>` enables the renderer shadow map (`app/game/index.tsx:205`). Terrain chunks `receiveShadow = true` (`TerrainChunk.tsx:307`). Ground plane `receiveShadow` (`Ground.tsx:112`). Shadow map is 1024×1024.

Point light shadows from campfires/lanterns are **not implemented** — no `castShadow` on point lights, and the campfire/lantern rendering has not been audited in this domain.

### 4.3 Ambient Light Color Shift

**Verdict: PARTIAL**

Ambient color is correctly modulated per time phase from `getSkyColors()`:
- Dawn: `#4a6fa1` (blue-grey zenith)
- Day: `#87ceeb`
- Dusk: `#6a4c93` (purple)
- Night: `#0b1a3e` (deep blue)

But this maps 4 phases, not the 8 stops in `dayNightConfig.lighting`. The richer per-slot config (`dawn: ambientColor #FFB347`, `dusk: #FF6B35`, etc.) is never consumed by the renderer.

### 4.4 Shadow Opacity at Dawn/Dusk

**Verdict: MISSING (rendering path)**

`DayNightComponent.shadowOpacity` is correctly set in `tickDayNight()` to 0.0 at evening/night and 0.3 at dawn/dusk from config (`dayNight.json:22, 56`). However since `DayNightComponent` is not read by the renderer (the ECS system is disconnected from the game screen), shadow opacity is never applied to the scene renderer. The shadow map intensity remains constant.

---

## 5. DAY/NIGHT VISUAL CYCLE

### 5.1 Smooth Transitions

**Verdict: PARTIAL**

`time.ts:getSkyColors()` returns one of 4 hard buckets. There is no interpolation between phases — colors snap at phase boundaries. The spec requires "smooth transition" through all 8 stops.

The `Lighting.tsx` ambient/directional colors lerp toward target using `useFrame` (implicit per-frame assignment), but since the source is already a hard-bucketed value, the lerp only smooths within-frame, not across phase transitions.

### 5.2 Day/Night Cycle Wiring (Two Systems, One Disconnected)

This is the central architectural finding. There are two parallel day/night systems:

**System A — `time.ts` (ACTIVE, drives rendering):**
- 4 phases, 2 sky colors (top/bottom), linear `dayProgress`
- Read by `app/game/index.tsx` → `<Sky>` + `<Lighting>`

**System B — `dayNight.ts` + ECS `DayNightComponent`/`SkyComponent` (BUILT, not rendered):**
- 8 time slots, full lighting config, `computeSunAngle()`, `computeStarIntensity()`, moon phase, cloud coverage
- `tickDayNight()` is called by `useGameLoop` (via game systems), but the computed values live in ECS — nothing reads the ECS `dayNightQuery` or `skyQuery` to drive the rendered sky or lighting.

The richer System B is implemented, tested, and correct — but completely bypassed in rendering.

---

## 6. GROUND PLANE vs TERRAIN CHUNKS

The scene renders **both** `<Ground>` (flat `PlaneGeometry`) and `<TerrainChunks>` simultaneously (`app/game/index.tsx:221–226`). The ground plane is a flat hardcoded `biome="grass"` plane that overlaps the terrain chunks. At `y = -0.05` it will z-fight with terrain chunks near `y = 0`. This is likely a legacy component from the pre-terrain-chunk era that was not removed after `TerrainChunks` was introduced.

---

## 7. SUMMARY VERDICTS

| System | Verdict | Key Evidence |
|--------|---------|-------------|
| Sky shader (gradient) | PARTIAL | 2-stop gradient, not 8-stop (`Sky.tsx:115`) |
| Sky time-of-day response | PARTIAL | 4 hard phases via `time.ts`; richer 8-slot ECS system orphaned |
| Stars (night layer) | MISSING | `starIntensity` computed but no render path (`dayNight.ts:177`, no consumer) |
| Moon phases | MISSING | `moonPhase` field exists in ECS, never updated or rendered |
| Procedural clouds | MISSING | `cloudCoverage`/`cloudSpeed` in ECS, never written or rendered |
| Weather → sky change | MISSING | No sky response to weather type |
| Heightmap generation | REAL | fBm via `SeededNoise`, seamless global coords (`terrainGenerator.ts:36–38`) |
| Heightmap noise variety | PARTIAL | Only `fbm()` called; `ridged()`/`domainWarp()` exist but unused (`terrainGenerator.ts:38`) |
| Heightmap caching | REAL | Geometry cache per entity ID in `TerrainChunks` (`TerrainChunk.tsx:253`) |
| Biome vertex colors | REAL | `computeBlendedColor()` with 8-tile blend zone (`TerrainChunk.tsx:49–100`) |
| Biome boundary blending | REAL | `biomeBlend [N,E,S,W]` from `ChunkManager`, tested |
| Rapier trimesh collider | REAL | Same heightmap as visual mesh (`TerrainChunk.tsx:205–240`, `325–335`) |
| Terrain LOD | MISSING | No LOD; all chunks same density |
| Linear fog | REAL | `THREE.Fog` near=20 far=40 in `Lighting.tsx:72` |
| Fog ↔ sky color match | REAL | Fog color += 12%/10%/8% sky zenith tint (`Lighting.tsx:65–67`) |
| FogVolumeComponent rendering | MISSING | ECS type + query exist; no system reads them |
| Exponential fog | MISSING | `THREE.FogExp2` not used |
| Fog density ↔ weather | MISSING | Fog params unchanged by weather |
| Directional light (sun) | PARTIAL | Color/intensity driven; orbit BROKEN (`scene.userData.gameHours` never set, always 12) |
| Shadow map | REAL | 1024×1024, enabled on Canvas, terrain receiveShadow |
| Shadow opacity ↔ time | MISSING | ECS value exists; not applied to renderer |
| Ambient light color shift | PARTIAL | 4-phase shift; 8-slot richer config never read |
| Day/night smooth transition | PARTIAL | Hard phase snaps; no lerp across phase boundaries |
| Thunderstorm lightning flash | MISSING | Not implemented anywhere |
| Ground plane vs TerrainChunks | BUG | Both rendered simultaneously; `Ground` is a flat legacy remnant at y=-0.05 that z-fights terrain |

---

## 8. PRIORITY FINDINGS

**Critical (rendering correctness broken):**
1. **Sun orbit broken** — `scene.userData.gameHours` is never written; sun is fixed at noon. Fix: write `scene.userData.gameHours = dayNight.gameHour` in game loop or `Lighting.useFrame`. (`Lighting.tsx:54`)
2. **Two day/night systems, one orphaned** — System B (`dayNight.ts` + ECS) has 8-slot config, star intensity, shadow opacity, all correct — but it is not wired to `<Sky>` or `<Lighting>`. Either connect the ECS output to scene props, or unify into one system.
3. **Ground + TerrainChunks z-fighting** — `<Ground biome="grass">` should be removed when terrain chunks are active. (`app/game/index.tsx:222–226`)

**High (features promised in spec, entirely absent):**
4. **Stars missing** — `starIntensity` is computed but no mesh or shader renders it.
5. **Fog volumes missing** — `FogVolumeComponent` and `fogVolumesQuery` defined; no renderer.
6. **8-stop sky gradient missing** — Spec §5.3 calls for 8 stops; only 2 are wired.

**Medium (incomplete but scaffolding exists):**
7. **Noise variety in terrain** — `ridged()` and `domainWarp()` are implemented and tested but `generateHeightmap` only calls `fbm()`.
8. **Weather → sky/fog** — No visual weather response (cloud cover, storm sky, fog density).
9. **Moon phases** — ECS field exists, no render.
10. **Shadow opacity** — ECS value exists, not applied.
