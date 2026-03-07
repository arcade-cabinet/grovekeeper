# Grok ChibiHarvest Integration Plan

**Date:** 2026-03-07
**Source:** `memory-bank/Grok-Refining_Chibi_3D_Character_Factory.md` (6,344 lines, ~15 iterations)
**Purpose:** Extract, translate, and integrate EVERY technique from the Grok conversation into Grovekeeper's TypeScript + R3F + Miniplex + Zustand stack. This document inventories the complete conversation tail-to-head, maps each feature to our codebase, and sequences implementation.

**Key Translation Rules:**
- All `Math.random()` -> `scopedRNG(scope, worldSeed, ...extra)`
- All inline constants -> `config/game/*.json`
- All JSX -> TSX with strict types
- All `useState`/`useRef` game state -> Miniplex ECS entities
- All persistent state -> Zustand gameStore (expo-sqlite backed)
- All `export default` -> named exports
- drei `Sphere`/`Cylinder`/`RoundedBox` -> raw `<mesh>` with `<sphereGeometry>`, `<cylinderGeometry>`, `<boxGeometry>` (fewer deps, PSX segments)
- PSX aesthetic enforced: low segment counts (6-8 for cylinders, icosahedron detail 1 for spheres)

---

## Conversation Evolution (Tail to Head)

### Layer 12: Seasonal Vegetation (lines 6100-6344)
**What Grok built:**
- 4-season cycle (Spring/Summer/Autumn/Winter) on a 45-second demo timer
- `seasonProgress` (0-4 float) and `currentSeason` (0-3 int) in Zustand store
- Terrain vertex colors change per season (green -> lush green -> orange/brown -> white)
- `SeasonalVegetation` component: wheat height/color lerps between seasons
- `SeasonalParticles` component: falling leaves (Autumn, 420 particles), snow (Winter, 1200 particles)
- Seasonal audio crossfade

**Grovekeeper mapping:**
- We already have `src/game/systems/time.ts` with season cycle -- use that as the driver
- Terrain vertex color update on season change -> `components/scene/Terrain.tsx`
- Tree canopy color shifts -> already done in BabylonJS, port to R3F `TreeInstances.tsx`
- Seasonal particles -> `components/effects/SeasonalParticles.tsx`
- Config: `config/game/seasons.json` with per-season terrain colors, vegetation scale, particle counts

**Files to create/modify:**
- `components/effects/SeasonalParticles.tsx` (NEW)
- `components/scene/Terrain.tsx` (modify for vertex color seasons)
- `config/game/seasons.json` (NEW)

---

### Layer 11: NPC Footstep Sounds (lines 5790-5950)
**What Grok built:**
- `NPCFootsteps` component attached to each WalkingFarmer
- Surface detection (grass vs dirt path vs wet/pond edge) -> different filter frequencies
- Left/right foot alternation (380ms step interval)
- Reusable panner pool (8 Panner3D instances recycled)
- Spatial positioning at NPC's world coordinates

**Grovekeeper mapping:**
- Attach footstep emitter to each `<ChibiNpc>` entity
- Surface detection from tile type at NPC position (ECS tile query, not just y-height)
- Step interval synced to walk animation frequency (`speed * 4` from leg swing)
- AudioManager panner pool pattern (reuse rather than create/destroy)
- Config: `config/game/audio.json` -> `footsteps.stepInterval`, `footsteps.filterFrequencies`

**Files:**
- `game/systems/npcFootsteps.ts` (NEW -- pure system, queries ECS for walking NPCs + tile type)
- `game/audio/AudioManager.ts` (modify -- add `playFootstep(x, z, surface, variant)` + panner pool)

---

### Layer 10: Spatial Audio Integration (lines 5553-5790)
**What Grok built:**
- `SpatialAudioListener` component synced to R3F camera (position + orientation) at ~60fps
- Tone.js `Panner3D` with HRTF panning model for every positional sound
- `SpatialSound` reusable component (position prop -> Panner3D)
- Spatial splash, bubble pop, tool swing sounds
- Pond water lapping at exact pond position

**Grovekeeper mapping:**
- We already have `game/systems/AudioManager.ts` using raw Web Audio API
- Add `Panner3D` equivalent using Web Audio `PannerNode` (no Tone.js dependency needed)
- `SpatialAudioListener` syncs to player camera position each frame
- Water lapping at pond/water tile positions (from ECS water tile query)
- Tool sounds offset from camera (right-hand position)

**Decision: Tone.js vs Raw Web Audio**
The Grok code uses Tone.js for convenience. We already have a working AudioManager with raw Web Audio API. Tone.js adds ~150KB to bundle. **Recommendation:** Keep raw Web Audio, port the spatial patterns (PannerNode, AudioListener). Tone.js's `PolySynth` and `Noise` can be replicated with `OscillatorNode` and white noise buffers at a fraction of the size.

**Files:**
- `game/audio/SpatialAudio.ts` (NEW -- PannerNode pool, listener sync)
- `game/audio/AudioManager.ts` (modify -- add spatial methods)
- `components/scene/SpatialAudioSync.tsx` (NEW -- R3F component, useFrame to sync listener)

---

### Layer 9: Procedural Ambient Soundscapes (lines 5348-5553)
**What Grok built:**
- 6 ambient layers: wind (brown noise, LPF 380Hz), birds (FM synth, random notes), insects (white noise, BPF 5200Hz), crickets (pulse osc 2400Hz), water lapping (brown noise, LPF 240Hz), wheat rustle (pink noise, BPF 620Hz)
- Time-of-day crossfading: dawn (birds loud), day (insects loud), dusk (crickets rise), night (wind + crickets)
- Seeded per farm name (wind gust timing, bird melody)
- Occasional distant owl hoot (night only)

**Grovekeeper mapping:**
- All synthesized with Web Audio oscillators + noise buffers (no Tone.js)
- Time-of-day driven by `game/systems/time.ts` season/hour
- Seeded timing via `scopedRNG('ambient', worldSeed)`
- Respect `prefers-reduced-motion` -> disable ambient audio pulsing
- Mute toggle in settings (already in gameStore)
- Config: `config/game/audio.json` -> `ambient.layers[]` with frequency, filter, volume, schedule

**Files:**
- `game/audio/AmbientSoundscape.ts` (NEW)
- `config/game/audio.json` (NEW -- all audio constants centralized)

---

### Layer 8: Tone.js Audio System (lines 5170-5348)
**What Grok built:**
- `AudioManager` singleton with PolySynth, Noise, Reverb, Filter
- `playSplash(strength)`, `playBubblePop()`, `playToolSwing(tool)`
- Ambient wind + occasional birds
- Mute toggle

**Grovekeeper mapping:**
- We already have `game/systems/AudioManager.ts` with synthesized SFX
- Port splash/bubble/tool-swing synthesis patterns using our existing OscillatorNode approach
- The Grok approach of `Tone.Noise('pink') -> Filter -> Destination` translates to: create AudioBuffer of noise -> BiquadFilterNode -> GainNode -> destination
- Our existing AudioManager already does this pattern -- just add the new sound types

**Files:**
- `game/audio/AudioManager.ts` (modify -- add splash, bubble, tool swing methods)

---

### Layer 7: Interactive Water Splashes (lines 4796-5020)
**What Grok built:**
- Raycast from screen center on watering can action
- `WaterSplashParticles` component: 240 point sprites (30 per splash x 8 concurrent)
- Droplets arc upward with gravity (`velocities[y] -= 28 * delta`)
- Lifetime-based fade
- Ripple injection into Gerstner shader via `splashes[8]` uniform array (vec4: x, z, time, strength)
- Ripple formula: `sin(dist * 12 - age * 18) * exp(-age * 2.5) * strength`
- Zustand: `addSplash(x, z, strength)` with FIFO buffer (max 12)

**Grovekeeper mapping:**
- Raycast from player camera center -> hit water tile -> spawn splash
- `components/effects/WaterSplashParticles.tsx` (instanced points)
- Pond shader receives `splashes[]` uniform, computes per-vertex ripple displacement
- ECS: splash events as ephemeral entities with TTL
- Config: `config/game/water.json` -> `splash.dropletCount`, `splash.gravity`, `splash.rippleFreq`

**Files:**
- `components/effects/WaterSplashParticles.tsx` (NEW)
- `game/systems/waterInteraction.ts` (NEW -- raycast + splash spawning)

---

### Layer 6: Underwater Bubble Trails (lines 5020-5170)
**What Grok built:**
- `BubbleTrails` component: 280 instanced spheres (35 per splash x 8 concurrent)
- Seeded phases for natural sway (`noise.noise2D(i * 0.1, i * 0.3)`)
- Rise with acceleration + horizontal drift (sin/cos sway)
- Size pulsing (`sin(age * 14) * 0.15`) + lifetime fade
- Zero-scale for hidden instances
- Triggered alongside splashes from watering can

**Grovekeeper mapping:**
- `components/effects/BubbleTrails.tsx` (instanced mesh, 6-segment icosahedron)
- Seeded phases from `scopedRNG('bubbles', worldSeed)`
- Triggered by water interaction system
- Config: `config/game/water.json` -> `bubbles.count`, `bubbles.riseSpeed`, `bubbles.swayAmplitude`

**Files:**
- `components/effects/BubbleTrails.tsx` (NEW)

---

### Layer 5: Advanced Water System (lines 3946-5020, across 4 iterations)

This evolved across 4 Grok prompts. Final state combines all techniques:

**5a. Gerstner Waves (final: 8-wave system)**
- 8 individually controlled waves in 3 bands:
  - Swell (2 waves): amp 0.28/0.22, freq 0.65/0.95, speed 1.1/1.4, steepness 0.85/0.75
  - Wind chop (2 waves): amp 0.18/0.14, freq 1.8/2.4, speed 2.2/2.8, steepness 0.65/0.55
  - Micro ripples (4 waves): amp 0.11-0.05, freq 3.2-7.0, speed 3.5-6.1, steepness 0.45-0.18
- Steepness Q parameter creates sharp, non-intersecting crests
- Choppiness: horizontal displacement scaled by steepness
- Analytic normals from partial derivatives
- Seeded wave phases + directions
- Dynamic wind direction/strength from time-of-day

**5b. Foam System**
- Steepness crest foam: `vSteepness * 1.4 + pow(dot(normal, up), 2) * 0.8`
- Shoreline foam: radial distance field + animated crawl
- Turbulent procedural foam: 4-octave seeded noise distorted by surface velocity
- Foam dissipation + advection (fades down wave faces)
- Fresnel foam boost at grazing angles

**5c. Caustics**
- In-shader caustics: 3-layer sine product distorted by surface normals
- `CausticsProjector` component: separate plane at pond bottom with additive blending
- Chromatic intensity + depth-aware
- Seeded phase offset

**5d. Fresnel + Specular + Depth Gradient**
- Fresnel reflection: `pow(1 - dot(view, normal), 2.6)`
- Sun specular: `pow(dot(reflect(-sun, normal), view), 96)`
- Depth gradient: deep blue -> shallow cyan via `smoothstep`

**Grovekeeper mapping:**
- Single `WaterShader.ts` module with GLSL vertex + fragment strings
- `components/scene/WaterSurface.tsx` (R3F mesh with ShaderMaterial)
- `components/scene/CausticsProjector.tsx` (additive blending plane)
- All wave parameters in `config/game/water.json`
- Seeded from `scopedRNG('water', worldSeed)` for phase offsets
- Time-of-day from game time system
- PSX note: reduce wave count to 4-6 for mobile perf, keep full 8 on desktop

**Files:**
- `game/shaders/WaterShader.ts` (NEW -- GLSL strings + uniform types)
- `components/scene/WaterSurface.tsx` (NEW)
- `components/scene/CausticsProjector.tsx` (NEW)
- `config/game/water.json` (NEW)

---

### Layer 4: Advanced Seeded Noise (lines 3124-3440)
**What Grok built:**
- `AdvancedSeededNoise` class:
  - Constructor: seeded Fisher-Yates shuffle on 256-entry permutation table (doubled to 512)
  - `hash(str)`: string -> uint32 via shift-multiply
  - `grad(hash, x, z)`: 16-direction gradient selection
  - `noise2D(x, z)`: true Perlin gradient noise with quintic fade `t^3(6t^2 - 15t + 10)`
  - `fbm(x, z, octaves=7, persistence=0.5, lacunarity=2.0)`: fractal Brownian motion
  - `ridged(x, z)`: `1 - |fbm(x*1.8, z*1.8, 5, 0.6)|` -- creates valleys/ridges
  - `domainWarped(x, z)`: warp input coords by secondary fbm before sampling main fbm

**Grovekeeper mapping:**
- We already have `game/utils/seedRNG.ts` with basic seeded random
- Add `game/utils/SeededNoise.ts` -- the full class, typed, with our `scopedRNG` for the permutation seed
- Used by terrain generation, vegetation placement, water phase offsets, NPC appearance
- Config: noise parameters in `config/game/terrain.json`

**Files:**
- `game/utils/SeededNoise.ts` (NEW)
- `config/game/terrain.json` (NEW)

---

### Layer 3: Seeded World Generation (lines 2398-3124, across 3 iterations)
**What Grok built:**
- `generateFarmWorld(seed)` / `generateAdvancedFarmWorld(seed)`:
  - Central farmyard (path tiles in a square)
  - Dirt paths carved outward (4 cardinal directions with random meander)
  - Buildings on flat areas adjacent to paths (barns, silos, windmill, chicken coops)
  - Wheat fields (380-520 instances, seeded positions, flat-terrain-only placement)
  - Orchard (65-82 apple trees in grid pattern)
  - Fenced enclosures (rectangular fence loops)
  - Decorative objects (flowers, hay bales, rocks, all seeded)
  - Clouds (28-40 high-altitude spheres)
  - Pond at fixed offset from center
- Terrain heightmap: `PlaneGeometry` with vertices displaced by noise
  - Domain-warped fBm * 9 + ridged * 3.5 + macro fBm * 14
  - Slope-aware vertex coloring (green flat, grey steep)

**Grovekeeper mapping:**
- We already have `game/world/WorldGenerator.ts` -- enhance with these techniques
- Terrain: analytical height function using `SeededNoise` (replaces simple sine octaves)
- Zone template system: each zone in `config/world/zones.json` defines what structures/vegetation to place
- Instance collection: `WorldGenerator.generate(seed, zoneConfig) -> WorldData` produces instance batches
- All placement via `scopedRNG` -- zero Math.random()
- Trees are our SPS tree species (not generic spheres) -- use species from `config/game/species.json`

**Files:**
- `game/world/WorldGenerator.ts` (major rewrite)
- `game/world/TerrainGenerator.ts` (NEW -- heightmap + vertex colors)
- `config/world/zones.json` (modify -- add terrain noise params, structure placement rules)
- `config/game/terrain.json` (NEW -- noise octaves, amplitude, frequency)

---

### Layer 2: Unified Game + HUD + Seed Modal (lines 1540-2398, across 2 iterations)
**What Grok built:**
- **New Game Modal:**
  - "Adjective Adjective Noun" farm name generator (15 adjectives x 15 nouns)
  - Manual text input OR shuffle button
  - `hashString()` -> `seededRandom()` LCG from seed string
  - Full character creator inside the modal (skin/clothes HSL sliders + part variant selectors)
  - "BEGIN YOUR HARVEST" start button
- **Game HUD:**
  - Left: virtual joystick (128x128px, 40px max radius)
  - Center-bottom: prominent tool slot (80x80px, amber border, clickable -> tool modal)
  - Right: contextual action buttons that change per tool (Hoe: "Till Soil"/"Plant Seeds", Axe: "Chop Tree"/"Gather Wood", Can: "Water Crops"/"Refill Can")
  - Top: farm name + customize button
- **Tool Selection Modal:** grid of 3 tools, current highlighted
- **Customize Modal:** full inspector (skin/clothes HSL + part selectors)
- **Player Rig:** first-person with tool visible at bottom-center (`position [0.65, -0.55, -0.95]`)
- **22 Walking NPCs:** seeded from farm name, randomized appearance via noise

**Grovekeeper mapping:**
- New Game Modal -> `components/game/NewGameModal.tsx`
  - Seed words from `config/game/seedWords.json` (brand-aligned: "Whispering", "Ancient", "Grove", etc.)
  - Character creator NOT needed (player is FPS, only sees hands/tools)
  - Difficulty selector (Easy/Normal/Hard) from existing difficulty system
- Game HUD -> enhance existing `game/ui/GameUI.tsx`
  - Center tool already exists in `ToolBelt.tsx` -- make it prominent + clickable
  - Contextual actions already in `ActionButton.tsx` -- expand per-tool variants
  - Tool selection modal -> enhance `ToolWheel.tsx`
- Player tool view -> `components/entities/ToolViewModel.tsx` (already in master plan)
- NPC generation -> `game/npcs/NpcManager.ts` generates appearances via `scopedRNG`

**Files:**
- `components/game/NewGameModal.tsx` (NEW)
- `config/game/seedWords.json` (NEW)
- `game/ui/ToolBelt.tsx` (modify -- prominent center slot)
- `game/ui/ActionButton.tsx` (modify -- per-tool contextual labels)

---

### Layer 1: Farming-Themed Chibi Characters (lines 988-1540)
**What Grok built (farming pivot from original dark-fantasy chibis):**
- **Head:** sphere (r=0.95, 32 segments) + 2 ear spheres (r=0.18) + nose sphere (r=0.12)
- **Hair (3 variants):**
  - 0: Messy -- 8 radiating cones + back sphere
  - 1: Bandana -- squished sphere + 4-sided cylinder band
  - 2: Straw Hat -- squished sphere + wide cylinder brim + small cylinder crown
- **Face (3 variants):**
  - Eyes: 2 capsules (white) + 2 small spheres (dark iris)
  - 0: Cheerful -- angled brows + curved smile capsule
  - 1: Content -- gentle brows + small tilted mouth
  - 2: Jolly -- raised brows + big smile capsule
- **Torso (3 variants):**
  - Base: capsule (r=0.45, h=0.45)
  - 0: Overalls -- cylinder skirt + 2 thin cylinder suspenders
  - 1: Flannel -- darker cylinder + amber accent stripe
  - 2: Gardener Apron -- same-color cylinder + RoundedBox apron
- **Arms:** capsule sleeve + sphere hand, angled outward 0.25 rad
- **Legs:** 2 groups, each with capsule leg + angled capsule boot
- **Tools (3 variants):**
  - Common: cylinder wooden handle (r=0.045, h=1.65)
  - 0: Hoe -- RoundedBox blade + cylinder extension
  - 1: Axe -- RoundedBox blade
  - 2: Watering Can -- cylinder body + cylinder spout + cylinder handle
- **HSL Color System:** `getThreeColor({h,s,l})` -> THREE.Color, `getDarkerColor(hsl, amount)` for shading
- **Idle Animation:** breathing y-bob `sin(t*2.8)*0.016` + rotation sway `sin(t*0.6)*0.05`

**Grovekeeper mapping:**
- This is THE chibi system for our NPCs. Much richer than the current 4-box version.
- **However:** must PSX-ify it. Reduce segments dramatically:
  - Head sphere: 32 segments -> `icosahedronGeometry` detail 1 (~42 verts, chunky look)
  - Ear/nose spheres: 16 segments -> `icosahedronGeometry` detail 0 (~12 verts)
  - Cylinders: all 16/32 segments -> 6 segments
  - Capsules: 16x32 -> 4x8 (very chunky, very PSX)
- HSL color system -> use our existing `scopedRNG` to pick from config palettes instead of continuous HSL
- Variant selection via `scopedRNG('npc-hair', worldSeed, npcId)` etc.
- Idle animation values -> `config/game/npcAnimation.json`
- Tools match our existing 8-tool system, not Grok's 3

**Files:**
- `components/entities/chibi/ChibiHead.tsx` (NEW)
- `components/entities/chibi/ChibiHair.tsx` (NEW)
- `components/entities/chibi/ChibiFace.tsx` (NEW)
- `components/entities/chibi/ChibiTorso.tsx` (NEW)
- `components/entities/chibi/ChibiArms.tsx` (NEW)
- `components/entities/chibi/ChibiLegs.tsx` (NEW)
- `components/entities/chibi/ChibiNpc.tsx` (NEW -- composer)
- `config/game/npcAppearance.json` (modify -- add variant counts, HSL ranges)
- `config/game/npcAnimation.json` (NEW)

---

### Layer 0: Original Character Factory (lines 1-988)
**What Grok built:**
- `Capsule` component: `React.forwardRef` wrapping `<mesh><capsuleGeometry>...</mesh>`
- `AnimatedGroup`: lerp-based position animation for exploded/assembled views
- `ScreenshotTaker`: PNG export via `gl.domElement.toDataURL`
- `Character` wrapper: idle breathing + rotation sway, layout positions for exploded/assembled
- Inspector UI: HSL sliders for skin/clothes, variant grid selectors, randomize button
- Original dark-fantasy variants (spiky hair, grumpy face, light armor, pitchfork/hammer/club)

**Grovekeeper mapping:**
- `Capsule` component -> `game/utils/CapsuleGeometry.tsx` (shared helper)
- `AnimatedGroup` -> not needed (no exploded view in-game)
- `ScreenshotTaker` -> could be useful for sharing/social features (future)
- Inspector UI -> not needed (NPCs are seeded, not player-customized)
- The farming-themed variants (Layer 1) supersede these original dark-fantasy ones

**Files:**
- `game/utils/CapsuleGeometry.tsx` (NEW -- shared helper component)

---

## Instanced World Rendering (cross-cutting, lines 1682-1737 + 2166-2185)
**What Grok built:**
- `InstancedGroup` / `InstancedMesh` component: takes `data[]` array, creates Object3D dummy, sets matrix per instance
- `WorldGeometry` component: separates instances by geometry type (box vs cylinder vs sphere)
- Shared geometries via `useMemo` + manual dispose not shown
- Module-scope `dummy` Object3D (zero allocation)

**Grovekeeper mapping:**
- We already have this documented in `docs/architecture/instanced-rendering.md`
- `components/scene/InstancedBatch.tsx` (already planned)
- Group by material, not object type
- Module-scope `_dummy` pattern already specified

---

## Implementation Sequence

### Phase 1: Foundation (no visible change, enables everything else)
1. `game/utils/SeededNoise.ts` -- AdvancedSeededNoise class (Perlin + fBm + ridged + domain warp)
2. `game/utils/CapsuleGeometry.tsx` -- shared capsule helper
3. `config/game/terrain.json` -- noise parameters
4. `config/game/water.json` -- wave, foam, caustic, splash, bubble parameters
5. `config/game/audio.json` -- ambient layers, footstep filters, volume curves
6. `config/game/npcAnimation.json` -- idle breathing, walk cycle, step timing
7. `config/game/seasons.json` -- per-season terrain colors, vegetation scales, particle counts
8. `config/game/seedWords.json` -- brand-aligned adjective/noun lists for seed phrases

### Phase 2: Chibi NPC System (replaces current 4-box NPCs)
1. `components/entities/chibi/ChibiHead.tsx` -- PSX icosahedron head + ears + nose
2. `components/entities/chibi/ChibiHair.tsx` -- 3+ variants (messy/bandana/straw hat)
3. `components/entities/chibi/ChibiFace.tsx` -- 3+ expressions (cheerful/content/jolly)
4. `components/entities/chibi/ChibiTorso.tsx` -- 3+ outfits
5. `components/entities/chibi/ChibiArms.tsx` -- capsule sleeves + sphere hands
6. `components/entities/chibi/ChibiLegs.tsx` -- capsule legs + angled boots
7. `components/entities/chibi/ChibiNpc.tsx` -- composer (assembles parts from ECS entity)
8. Update `game/npcs/NpcManager.ts` -- generate variant indices via scopedRNG
9. Update `config/game/npcAppearance.json` -- variant counts, color palettes
10. Tests for seeded appearance determinism

### Phase 3: Terrain & World Generation
1. `game/world/TerrainGenerator.ts` -- heightmap using SeededNoise (fBm + ridged + domain warp)
2. `components/scene/Terrain.tsx` -- PlaneGeometry with vertex displacement + slope-aware vertex colors
3. Update `game/world/WorldGenerator.ts` -- use SeededNoise for all placement decisions
4. Slope-aware structure placement (buildings only on flat terrain)
5. Vegetation placement via noise thresholds
6. Tests for deterministic world generation

### Phase 4: Water System
1. `game/shaders/WaterShader.ts` -- GLSL vertex (Gerstner) + fragment (foam + caustics + fresnel)
2. `components/scene/WaterSurface.tsx` -- ShaderMaterial mesh for water tiles
3. `components/scene/CausticsProjector.tsx` -- additive blending plane beneath water
4. `config/game/water.json` -- all wave/foam/caustic parameters
5. Tests for shader uniform updates

### Phase 5: Water Interactions
1. `game/systems/waterInteraction.ts` -- raycast + splash/bubble spawning
2. `components/effects/WaterSplashParticles.tsx` -- instanced point sprites with gravity
3. `components/effects/BubbleTrails.tsx` -- instanced spheres with sway + rise
4. Ripple injection into water shader (splashes[] uniform)
5. Connect to tool use system (watering can -> splash)

### Phase 6: Audio System
1. `game/audio/SpatialAudio.ts` -- PannerNode pool, AudioListener sync
2. `game/audio/AmbientSoundscape.ts` -- 6 layers, time-of-day crossfading
3. `components/scene/SpatialAudioSync.tsx` -- useFrame listener position update
4. Update `game/audio/AudioManager.ts` -- add splash, bubble, tool swing, footstep methods
5. `game/systems/npcFootsteps.ts` -- surface-aware spatial footsteps
6. `config/game/audio.json` -- all audio constants

### Phase 7: Seasonal Effects
1. `components/effects/SeasonalParticles.tsx` -- falling leaves (autumn) + snow (winter)
2. Terrain vertex color updates on season change
3. Vegetation color/scale lerps
4. Seasonal audio crossfade (from AmbientSoundscape)
5. `config/game/seasons.json` -- all season parameters

### Phase 8: UI & Game Flow
1. `components/game/NewGameModal.tsx` -- seed phrase generator + difficulty selector
2. `config/game/seedWords.json` -- brand-aligned word lists
3. Update `game/ui/ToolBelt.tsx` -- prominent center slot (clickable -> tool modal)
4. Update `game/ui/ActionButton.tsx` -- per-tool contextual labels
5. Loading screen between seed generation and scene hydration

---

## What We DON'T Take from Grok

| Grok Feature | Why Skip |
|---|---|
| Tone.js dependency | Raw Web Audio API is lighter, we already have AudioManager |
| HSL slider UI for skin/clothes | NPCs are seeded, not player-customized |
| Exploded view / AnimatedGroup | Debug tool, not gameplay |
| Screenshot export | Future social feature, not core |
| Studio mode (character creator) | FPS game, player never sees own body |
| OrbitControls | We use FPS camera controller |
| lucide-react icons | We use custom SVG icons |
| RoundedBox from drei | Plain boxGeometry is more PSX |
| 32-segment spheres | PSX aesthetic needs low-poly (icosahedron detail 1) |
| Clouds as spheres | We use CSS sky / Sky component |
| `Environment` preset | PSX doesn't use HDR environment maps |
| `ContactShadows` | We use directional shadow maps |

---

## Vertex Budget Impact

| Feature | Verts per Instance | Count | Total |
|---|---|---|---|
| Chibi NPC (PSX segments) | ~180 | 10 | 1,800 |
| Water surface (72-seg cylinder) | ~146 | 1-3 | 438 |
| Caustics projector (64-seg circle) | ~66 | 1-3 | 198 |
| Splash particles (points) | 1 | 240 | 240 |
| Bubble instances (ico detail 0) | 12 | 280 | 3,360 |
| Seasonal particles (points) | 1 | 1,200 | 1,200 |
| **Total new geometry** | | | **~7,236** |

Well within budget. Current scene is ~30K verts with trees + terrain + structures.

---

## Success Criteria

- [ ] Same seed string produces identical world, NPCs, water, vegetation every time
- [ ] Zero `Math.random()` calls in any new code
- [ ] All tuning constants in `config/game/*.json`
- [ ] All new components under 300 lines
- [ ] Water renders at 60fps on desktop, 55fps on mobile (375px viewport)
- [ ] Chibi NPCs are visually richer than current 4-box version but stay PSX-chunky
- [ ] Audio respects mute setting and `prefers-reduced-motion`
- [ ] Seasonal transitions are smooth (lerp-based, not sudden)
- [ ] All new systems have adjacent test files
- [ ] TypeScript strict mode, zero type errors
