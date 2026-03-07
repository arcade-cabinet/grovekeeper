**Historical -- superseded by [`docs/plans/2026-03-07-unified-game-design.md`](2026-03-07-unified-game-design.md)**
*The unified design is the current master plan. This document is retained for historical reference only.*

---

# Grovekeeper: Comprehensive Design & Implementation Plan

**Date:** 2026-03-06 (revised 2026-03-07)
**Status:** Superseded (2026-03-07). See unified-game-design.md.
**Workflow:** For each item: spec section in GAME_SPEC.md -> architecture doc -> tests -> implementation -> wire -> verify -> update status.

---

## Table of Contents

1. [Vision & Identity](#vision)
2. [Architecture Overview](#architecture)
3. [Scene Architecture (R3F)](#scene)
4. [Procedural World Generation](#world-gen)
5. [Instanced Rendering](#instancing)
6. [Input System & Touch Controls](#input)
7. [FPS Camera & Player Controller](#fps)
8. [Tool View Model & Juice](#tools)
9. [NPC System (Chibi)](#npcs)
10. [HUD Overlay](#hud)
11. [Complete System Inventory](#inventory)
12. [Implementation Phases](#phases)
13. [Appendix A: File Inventory](#appendix-a)
14. [Appendix B: Config Gaps](#appendix-b)
15. [Appendix C: BabylonJS Archive Recovery](#appendix-c)
16. [Appendix D: Monolith Decomposition](#appendix-d)

---

<a id="vision"></a>
## 1. Vision & Identity

**Grovekeeper** is a cozy first-person grove-tending simulation. Mobile-first native app (Expo SDK 55, portrait-primary). Target session: 3-15 minutes.

**Tagline:** *"Every forest begins with a single seed."*

**Core Loop:** Explore -> Plant -> Tend -> Harvest -> Expand. The player physically holds tools in first-person view. Every action (DIG, CHOP, WATER, PLANT, PRUNE) is embodied.

**Aesthetic:** PSX low-poly. No antialiasing. 1:1 pixel ratio. Flat shading. Chunky geometry. Tool models are real GLB assets (5 available), NPCs are procedural chibi box-characters, trees are SPS-generated geometry.

### Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Expo SDK 55 | Universal: web + iOS + Android |
| 3D Engine | React Three Fiber 9 + drei 10 | Declarative scene components |
| Physics | @react-three/rapier | FPS capsule collision |
| ECS | Miniplex 2.x | Runtime game state |
| State | Zustand 5 + expo-sqlite | Persistent state via SQLite |
| NPC AI | Yuka 0.7 | Goal-driven NPC behavior |
| Styling | NativeWind 4 + Tailwind 3 | Universal styling |
| Testing | Jest + Maestro | Unit + mobile E2E |
| Language | TypeScript 5.9+ strict | - |
| Lint/Format | Biome 2.4+ | Single tool |
| Package | pnpm 9+ | - |

### Hard Rules

| Rule | Enforcement |
|------|-------------|
| Spec before code | Every system needs a GAME_SPEC.md section |
| No file over 300 lines | Decompose into subpackage with index.ts |
| No Math.random() | `scopedRNG(scope, worldSeed, ...extra)` only |
| No inline tuning constants | Config in `config/game/*.json` |
| No placeholders/fallbacks | Hard-error if asset/feature missing |
| Quality gate on commit | lint + tsc + test must pass |
| Mobile-first | 375px min, 44px touch targets, portrait |
| Named exports only | Never `export default` |
| pnpm only | Never npm or yarn |
| Biome only | Never ESLint or Prettier |

---

<a id="architecture"></a>
## 2. Architecture Overview

### State Split

| Changes every frame? | Persists across sessions? | Location |
|---|---|---|
| Yes | No | ECS only |
| Yes | Yes | ECS + serialized to Zustand |
| No | Yes | Zustand only |

**ECS (Miniplex):** Player position, tree renderable.scale, tile occupancy, NPC positions, growth timers.

**Zustand (gameStore):** Level, XP, coins, resources, unlocks, achievements, settings, grove snapshot, quest progress, prestige state.

### Directory Structure (Target)

```
src/
  game/
    input/                    -- InputManager + providers
      InputActions.ts         -- InputFrame interface
      InputManager.ts         -- Singleton merger
      providers/
        KeyboardMouseProvider.ts
        TouchProvider.ts
        GamepadProvider.ts
        AIProvider.ts
    ecs/                      -- Miniplex world + queries
    world/                    -- WorldGenerator, terrain, paths, instances
      WorldGenerator.ts
      terrain.ts
      pathGenerator.ts
      instanceCollector.ts
      plotPlacer.ts
      types.ts
      data/starting-world.json
    systems/                  -- Pure function ECS systems
    stores/                   -- Zustand slices
    npcs/                     -- NPC data + manager
    quests/                   -- Quest chain engine
    events/                   -- Festival + encounter scheduler
    ai/                       -- PlayerGovernor, NpcBrain
    utils/                    -- seedRNG, treeGeometry, gridMath
    constants/                -- codex entries
    config/                   -- TypeScript config loaders
    actions/                  -- GameActions
    hooks/                    -- useGameLoop, useInteraction, etc.
    db/                       -- expo-sqlite + drizzle-orm
    ui/                       -- All HUD/menu React components
  components/
    scene/                    -- R3F scene components (static world)
      InstancedBatch.tsx
      SharedGeometries.tsx
      Terrain.tsx
      WorldInstances.tsx
      Lighting.tsx
      Sky.tsx
    entities/                 -- R3F entity components (dynamic ECS)
      TreeInstances.tsx
      NpcMeshes.tsx
      ChibiNpc.tsx
      StructureMeshes.tsx
    player/                   -- FPS player components
      PlayerController.tsx
      ToolViewModel.tsx
      Crosshair.tsx
      TargetInfo.tsx
    interaction/              -- Selection/placement
      SelectionRing.tsx
      PlacementGhost.tsx
    ui/                       -- shadcn/ui primitives
  config/
    game/                     -- 20+ JSON config files
    world/                    -- Zone/structure/encounter data
    theme.json                -- Design tokens
  assets/
    models/tools/             -- 5 PSX tool GLBs + shared texture
    textures/                 -- PBR texture sets
```

### Architecture Docs (Self-Contained)

All architecture is documented in `docs/architecture/`. Agents read these -- not external codebases.

| Doc | Covers |
|-----|--------|
| `overview.md` | Tech stack, directory layout, data flow |
| `ecs-patterns.md` | Miniplex world, components, queries |
| `state-management.md` | Zustand store, persistence |
| `rendering.md` | R3F scene components, instancing, growth |
| `procedural-world.md` | Terrain, paths, instances, structure placement |
| `instanced-rendering.md` | InstancedBatch, material batching, shared geometries |
| `input-system.md` | InputManager, providers, InputFrame |
| `fps-camera.md` | PlayerController, Rapier capsule, movement |
| `tool-viewmodel.md` | Tool GLBs, use animations, raycast interaction |
| `view-model-juice.md` | Hand sway, walk bob, sprint FOV |
| `touch-controls.md` | Virtual joystick, swipe-to-look, action buttons |
| `npc-system.md` | Chibi NPCs, path-following, appearance generation |
| `scene-composition.md` | Full scene tree, draw call budget, game loop |
| `hud-overlay.md` | HUD layout, component specs, design tokens |
| `performance.md` | Budgets, instancing, code splitting |

---

<a id="scene"></a>
## 3. Scene Architecture (R3F)

Full spec: `docs/architecture/scene-composition.md`

### Scene Tree

```jsx
<Canvas shadows gl={{ antialias: false, pixelRatio: 1 }}>
  <Physics>
    <Terrain heightAt={worldData.terrain.heightAt} />
    <WorldInstances batches={worldData.instances} />
    <PlayerController />
    <ToolViewModel />
    <TreeInstances />
    <NpcMeshes />          {/* Chibi box-characters */}
    <StructureMeshes />
    <Lighting />
    <Sky />
  </Physics>
</Canvas>
```

### PSX Canvas Config

| Setting | Value | Why |
|---------|-------|-----|
| antialias | false | Crispy pixel edges |
| pixelRatio | 1 | No HiDPI scaling |
| toneMapping | None | Raw colors |
| colorSpace | LinearSRGB | No gamma curve |
| Shadow map | 512 mobile / 1024 desktop | Low-res matches aesthetic |

### Draw Call Budget: <= 50

| Category | Count |
|----------|-------|
| Terrain | 1 |
| World instances (6-8 material batches) | 8 |
| Tool model | 1 |
| Trees (1 per species, up to 15) | 10 |
| NPCs (individual chibi meshes) | 5 |
| Structures | 6 |
| Sky | 1 |
| Shadow pass | ~10 |
| **Total** | **~42** |

---

<a id="world-gen"></a>
## 4. Procedural World Generation

Full spec: `docs/architecture/procedural-world.md`

### Pipeline

```
ZoneConfig (JSON) + worldSeed
    |
    v
WorldGenerator.generate(seed, config)
    |
    +--> terrain.ts      --> heightAt(wx, wz) function
    +--> pathGenerator.ts --> grid with PATH tiles + path node list
    +--> plotPlacer.ts    --> structure positions, tree scattering
    +--> instanceCollector.ts --> batched InstanceData[] by material
    |
    v
WorldData { terrain, instances, paths, entities }
    |
    +--> <Terrain /> reads heightAt
    +--> <WorldInstances /> reads instance batches
    +--> ECS hydration creates interactive entities
```

### Terrain Height

Analytical function (no heightmap texture). Two sine/cosine octaves with zone-center flattening:

```typescript
height = (sin(wx * 0.02 + phase1) * cos(wz * 0.03 + phase2) * 3 +
          sin(wx * 0.05 + wz * 0.04 + phase1) * 1.5) * (1 - flattenFactor);
```

### Path Carving

Random walk from center plaza in 4 cardinal directions with wobble and branching. All randomness via `scopedRNG('paths', seed)`.

### Instance Collection

Walk the grid, produce arrays grouped by material type:

| Batch | Content | Geometry |
|-------|---------|----------|
| soil | Ground tiles | Box |
| path | Walkable paths | Box |
| rock | Rock obstacles | Box, Sphere |
| water | Water tiles | Box |
| bark | Decorative tree trunks | Cylinder |
| leaf | Decorative tree canopies | Sphere |

### Two Categories of World Objects

1. **Instances** (visual-only) -- rendered via `<InstancedBatch />`. No ECS entity. Ground tiles, border trees, paths, decorative rocks.

2. **Entity spawns** (interactive) -- become ECS entities. Trees the player can chop, NPCs to talk to, structures to build. Their meshes are managed by dedicated components (`<TreeInstances />`, `<ChibiNpc />`).

---

<a id="instancing"></a>
## 5. Instanced Rendering

Full spec: `docs/architecture/instanced-rendering.md`

### Core Component: `<InstancedBatch />`

Renders any array of `InstanceData[]` as a single `<instancedMesh>` per geometry type. Module-scope `_dummy` Object3D for zero per-frame allocation. Matrices set once on data change (static world = zero per-frame cost).

### Geometry Separation

`InstancedMesh` supports only ONE geometry. Data arrays mixing box + cylinder + sphere are split internally into separate `<instancedMesh>` elements per geometry type.

### Shared Geometries

Created once via `useMemo`, disposed on unmount:
- Box: `BoxGeometry(1, 1, 1)`
- Cylinder: `CylinderGeometry(0.5, 0.5, 1, 6)` -- 6 segments for PSX look
- Sphere: `IcosahedronGeometry(0.5, 1)` -- 42 verts, low-poly

### Dynamic Trees (Separate Strategy)

Interactive trees use per-species `<instancedMesh>` with SPS-generated geometry. Instance matrices updated every frame for growth animation (scale lerp). NOT managed by `InstancedBatch`.

---

<a id="input"></a>
## 6. Input System & Touch Controls

Full specs: `docs/architecture/input-system.md`, `docs/architecture/touch-controls.md`

### InputFrame Interface

Game code reads this per-tick snapshot -- never raw events:

```typescript
interface InputFrame {
  moveX: number;        // strafe: -1..+1
  moveZ: number;        // forward/back: -1..+1
  lookDeltaX: number;   // yaw (radians)
  lookDeltaY: number;   // pitch (radians)
  useTool: boolean;     // primary action
  altAction: boolean;   // secondary
  pause: boolean;
  interact: boolean;    // NPC talk, structure activate
  openInventory: boolean;
  toolSlot: number;     // 1-N specific slot
  toolCycle: number;    // -1/+1 prev/next
}
```

### Providers

| Provider | Platform | Inputs |
|----------|----------|--------|
| KeyboardMouseProvider | Desktop | WASD + mouse look + pointer lock |
| TouchProvider | Mobile | Custom joystick + viewport swipe + USE/CYCLE buttons |
| GamepadProvider | Gamepads | Standard mapping |
| AIProvider | Testing | Programmatic input for Governor autoplay |

### Custom Virtual Joystick (No nipplejs)

Custom implementation in ~20 lines. Touch captures center, normalizes displacement to [-1, 1], clamps to 40px radius. Removes nipplejs dependency.

### Mobile Layout (Portrait, 375px)

```
+----------------------------------+
| [Resources]        [Time/Season] |
|                                  |
|         3D VIEWPORT              |
|         (swipe-to-look)          |
|            [ + ] crosshair       |
|         [Target info]            |
|                                  |
| [Stamina] [XP]                   |
|  (O)                      [USE] |
|  joystick               [NEXT] |
|  128x128                        |
+----------------------------------+
```

---

<a id="fps"></a>
## 7. FPS Camera & Player Controller

Full spec: `docs/architecture/fps-camera.md`

### Camera Parameters

| Parameter | Value |
|-----------|-------|
| Eye height | 1.6 units |
| Capsule radius | 0.35 |
| FOV | 65 (72 when sprinting) |
| Near/Far | 0.1 / 100 |
| Pitch clamp | +/- 72 degrees |
| Walk speed | 4 units/sec |
| Sprint | 1.3x |
| Ground plane | Y = 0, no jump, no gravity |

### PlayerController

R3F component that every frame:
1. Polls `InputManager.poll(dt)` -> InputFrame
2. Applies look (yaw/pitch with clamping)
3. Computes movement from forward/right basis vectors
4. Moves Rapier KinematicCharacterController capsule
5. Syncs camera position to capsule
6. Calls `InputManager.postFrame()`

### Zone Transitions

Fade-to-black (0.5s CSS), teleport player, regenerate WorldData, fade-in. Canvas NOT remounted -- only data changes.

---

<a id="tools"></a>
## 8. Tool View Model & Juice

Full specs: `docs/architecture/tool-viewmodel.md`, `docs/architecture/view-model-juice.md`

### Available GLB Models

| Game Tool | GLB | Verts | Size | Action |
|-----------|-----|-------|------|--------|
| trowel | Hoe.glb | 70 | 13KB | Planting, tilling |
| axe | Axe.glb | 56 | 13KB | Chopping, harvesting |
| pruning-shears | Hatchet.glb | 56 | 13KB | Pruning, shaping |
| shovel | Shovel.glb | 127 | 15KB | Digging, clearing |
| pickaxe | Pickaxe.glb | 94 | 14KB | Mining rocks |

All share `Tools_Texture.png` (128x128). Tools without models are EXCLUDED from the game -- hard error, never placeholder.

### Use Animations

Keyframe-driven parametric curves (not AnimationMixer):

| Animation | Motion | Tools |
|-----------|--------|-------|
| stab | Forward thrust, spring back | Trowel |
| chop | Arc overhead, strike down | Axe |
| dig | Push down, lever up, return | Shovel |
| snip | Quick squeeze (scale X) | Pruning Shears |
| strike | Forward hit, recoil | Pickaxe |

### View Model Juice

| Effect | Parameters | Reduced Motion |
|--------|-----------|---------------|
| Hand sway | 1.5x turn multiplier, +/-0.2 clamp, 10*dt recovery | Disabled |
| Walk bob | 10Hz/0.02 amp walk, 15Hz/0.05 amp sprint | Disabled |
| Idle breath | 2Hz/0.005 amp | Disabled |
| Sprint FOV | 65 -> 72 at 8*dt lerp | Disabled |
| Tool switch | Drop 0.25s, swap, rise 0.25s | Instant swap |

All parameters in `config/game/viewModelJuice.json`.

### Raycast Interaction

Every frame: raycast from camera center. Hit detection on ground, tree, NPC, structure. Range per tool category (hand: 3, long: 4, placement: 5, inspection: 6). Context display below crosshair.

---

<a id="npcs"></a>
## 9. NPC System (Chibi)

Full spec: `docs/architecture/npc-system.md`

### Procedural Chibi Meshes

NPCs are 4 box primitives: head (0.55^3), body (0.45x0.5x0.3), 2 legs (0.18x0.3x0.18). Total: ~72 vertices per NPC. **No GLB models needed** -- PSX box-characters ARE the art style.

### Seeded Appearance

Each NPC gets deterministic appearance from `scopedRNG('npc-appearance', worldSeed, npcId)`:
- Skin tone: 6 earth-toned options
- Cloth color: 9 forest/earth options
- Scale: 0.8 - 1.1
- Speed: 1.5 - 3.0 units/sec

### Walk Animation

- **Leg swing:** `sin(t * speed * 4) * 0.6` alternating left/right
- **Vertical bounce:** `|sin(t * speed * 8)| * 0.15 * scale`
- **Idle:** All animation stops, legs reset

### Role Visual Accents (Future)

| Role | Accent |
|------|--------|
| Merchant | Box hat (amber) |
| Elder | Larger scale (1.1+) |
| Wanderer | Cylinder walking stick |
| Guard | Box shield (grey) |

### Path-Following AI

NPCs walk between path nodes from WorldData. Random target selection via seeded RNG. Arrive -> idle briefly -> pick new target. Face movement direction via `atan2`.

### 10 NPCs

1. **Elder Rowan** -- Tips, village elder
2. **Hazel** -- Trading, wandering trader
3. **Botanist Fern** -- Quests, species discovery
4. **Blossom** -- Seed merchant
5. **Bramble** -- Weather tips
6. **Willow** -- Herbalist tips
7. **Oakley** -- Master carpenter, crafting
8. **Thorn** -- Forest ranger, quests
9. **Sage** -- Lore keeper
10. **Ember** -- Wandering alchemist

---

<a id="hud"></a>
## 10. HUD Overlay

Full spec: `docs/architecture/hud-overlay.md`

All HUD is HTML/CSS layered on the canvas (zero draw calls). Container has `pointer-events: none`; interactive elements have `pointer-events: auto`.

### Components

| Component | Position | Content |
|-----------|----------|---------|
| ResourceBar | Top-left | Timber/Sap/Fruit/Acorn counts |
| TimeDisplay | Top-right | Day, sun/moon icon, season |
| Crosshair | Center | 1px white dot |
| TargetInfo | Below center | Target name, action, stamina cost |
| StaminaGauge | Bottom-left | Green/yellow/red bar |
| XPBar | Below stamina | Level + progress |
| ToolBelt | Bottom-right | Current tool icon + name |
| Toast | Top-center | Ephemeral notifications |
| FloatingParticles | World-projected | +XP/+Timber floating text |
| WeatherOverlay | Full-screen | CSS rain/drought/wind/petals |
| VirtualJoystick | Bottom-left (mobile) | 128x128 touch zone |
| ActionButtons | Bottom-right (mobile) | USE + NEXT buttons |

### Styling Standards

- Fonts: Fredoka headings, Nunito body
- Panel: `bg-stone-900/85 border-amber-700/30 backdrop-blur-sm`
- Colors: CSS custom properties from `config/theme.json`
- Touch targets: minimum 44x44px
- Animations: `motion-safe:` prefix on all transitions

---

<a id="inventory"></a>
## 11. Complete System Inventory

### Source Code Stats (from audit)

| Metric | Value |
|--------|-------|
| Source files | 123 |
| Test files | 57 |
| Source lines | 23,260 |
| Test lines | 9,917 |
| Test-to-code ratio | 43% |

### System Status

| System | File | Lines | Status | Wired? |
|--------|------|-------|--------|--------|
| Time | time.ts | 166 | Complete | Yes |
| Weather | weather.ts | 168 | Complete | Yes |
| Growth | growth.ts | 91 | Complete | Yes |
| Harvest | harvest.ts | 95 | Complete | Yes |
| Stamina | stamina.ts | 35 | Complete | Yes |
| Achievements | achievements.ts | 401 | Complete | Yes |
| Prestige | prestige.ts | 173 | Complete | Yes |
| Quests | quests.ts | 995 | Complete | Yes |
| Trading | trading.ts | 60 | Complete | Yes |
| Pathfinding | pathfinding.ts | 166 | Complete | Yes |
| NPC Movement | npcMovement.ts | 97 | Complete | Yes |
| Save/Load | saveLoad.ts | 194 | Complete | Yes |
| Offline Growth | offlineGrowth.ts | 132 | Complete | Yes |
| Level Unlocks | levelUnlocks.ts | 79 | Complete | Yes |
| Tool Upgrades | toolUpgrades.ts | 60 | Complete | Yes |
| Grid Expansion | gridExpansion.ts | 74 | Complete | Yes |
| Wild Tree Regrowth | wildTreeRegrowth.ts | 73 | Complete | Yes |
| Species Discovery | speciesDiscovery.ts | 122 | Complete | Yes |
| Market Events | marketEvents.ts | 193 | Complete | Yes |
| Supply/Demand | supplyDemand.ts | -- | Complete | Yes |
| Traveling Merchant | travelingMerchant.ts | 328 | Complete | Yes |
| Quest Chains | questChainEngine.ts | 314 | Complete | Yes |
| Event Scheduler | eventScheduler.ts | 292 | Complete | Yes |
| **AudioManager** | **AudioManager.ts** | **328** | **Complete** | **NO -- orphaned** |
| **NativeAudioManager** | **NativeAudioManager.ts** | **83** | **Complete** | **NO -- orphaned** |
| **Discovery (zones)** | **discovery.ts** | **21** | **Minimal** | **NO -- orphaned** |
| **Grid Generation** | **gridGeneration.ts** | **169** | **Complete** | **NO -- orphaned** |
| **Recipes** | **recipes.ts** | **535** | **Complete** | **NO -- orphaned** |
| **Seasonal Market** | **seasonalMarket.ts** | **48** | **Complete** | **NO -- orphaned** |
| **Zone Bonuses** | **zoneBonuses.ts** | **55** | **Complete** | **NO -- orphaned** |

### UI Component Status

**18 components wired and working:** HUD, PauseMenu, MainMenu, ActionButton, ToolBelt, StaminaGauge, XPBar, TimeDisplay, ResourceBar, SeedSelect, Camera, Ground, Lighting, Sky, TreeInstances, NpcMeshes, Player, button/text/icon.

**25 components exist but NOT wired:**

| Component | Lines | Needs wiring to |
|-----------|-------|----------------|
| GameUI | 484 | Root orchestrator -- wire or delete |
| NewGameModal | 273 | MainMenu "New Game" button |
| AchievementPopup | 309 | Achievement unlock event |
| WeatherOverlay | 249 | Weather state changes |
| RulesModal | 234 | Game start (!hasSeenRules) |
| VirtualJoystick | 285 | Replace with custom joystick (remove nipplejs) |
| RadialActionMenu | 290 | Mobile action selection |
| SeedSelect | 283 | Species picker |
| ActionButton | 254 | Context-sensitive actions |
| PlacementGhost | 208 | Build mode active |
| TradeDialog | 193 | NPC merchant interaction |
| TutorialOverlay | 188 | First-time tutorial |
| FloatingParticles | 188 | Harvest/XP events |
| QuestPanel | 184 | HUD always visible |
| ToolWheel | 184 | Tool selection |
| BuildPanel | 176 | Structure placement |
| NpcDialogue | 170 | NPC interaction |
| StatsDashboard | 164 | Pause menu tab |
| Logo | 150 | Main menu |
| Toast | 140 | Notifications |
| FarmerMascot | 124 | Main menu / tutorial |
| MobileActionButtons | 126 | Mobile controls |
| MiniMap | 421 | Desktop HUD |
| MiniMapOverlay | 155 | Minimap container |
| ErrorBoundary | 100 | Wrap game screen |

### Math.random() Violations

| File | Lines | Context | Fix |
|------|-------|---------|-----|
| PlayerGovernor.ts | 372-373 | Tile selection | scopedRNG("governor", worldSeed) |
| NpcBrain.ts | 156, 274-275 | Wander timer/offset | scopedRNG("npc", worldSeed, npcId) |
| AudioManager.ts | 303 | White noise | Acceptable (audio synthesis) |
| WeatherOverlay.tsx | 61-63, 152 | CSS animation delays | Acceptable (visual-only) |

### Monoliths (>300 lines)

| File | Lines | Decomposition |
|------|-------|--------------|
| gameStore.ts | 1083 | 6 slices: progression, economy, structure, discovery, quest, settings |
| quests.ts | 995 | Extract 9 goal pools to config JSON |
| treeGeometry.ts | 950 | trunk/branch/leaf builders + merger |
| PauseMenu.tsx | 755 | StatsTab, ProgressTab, SettingsTab |
| PlayerGovernor.ts | 611 | Extract evaluators |
| db/queries.ts | 594 | Per-table modules |
| recipes.ts | 535 | Move 24 recipes to config JSON |
| GameUI.tsx | 484 | Wire or delete |
| codex.ts | 433 | Move lore to config JSON |
| MiniMap.tsx | 421 | Separate canvas from data |
| achievements.ts | 401 | Use config JSON, keep checker functions |
| GameActions.ts | 403 | Group by domain |
| useGameLoop.ts | 400 | Extract NPC AI tick |

---

<a id="phases"></a>
## 12. Implementation Phases

### Phase 0: Spec Completion

Make GAME_SPEC.md describe the IDEAL game. Agents develop against this spec.

#### 0.1 Sections to rewrite for FPS perspective

| Section | Current | Target |
|---------|---------|--------|
| User Flow | Describes "broken" flow | Ideal: menu -> new game modal -> loading -> tutorial -> game |
| Input System | Isometric WASD + tap-to-move | FPS: InputManager + providers + InputFrame |
| HUD Layout | Diorama overlay | FPS: crosshair, target info, tool indicator |

#### 0.2 Sections needing more precision

| Section | Issue |
|---------|-------|
| NPC System | "quest chains" mentioned, no data model |
| Trading | Supply/demand "drift" has no formula |
| Crafting | < 1 page, minimal detail |
| Tutorial | 8 steps but no advancement logic |
| Save/Persistence | Loose "Legend State" mention |
| Audio | SFX listed but no synth params |

#### 0.3 Sections missing entirely

| Topic | Source | Priority |
|-------|--------|----------|
| Festival System | eventScheduler.ts | HIGH |
| Random Encounters | eventScheduler.ts | HIGH |
| Procedural World Generation | docs/architecture/procedural-world.md | HIGH |
| Instanced Rendering Pipeline | docs/architecture/instanced-rendering.md | HIGH |
| Chibi NPC Rendering | docs/architecture/npc-system.md | HIGH |
| View Model Juice | docs/architecture/view-model-juice.md | MEDIUM |
| Touch Controls (custom joystick) | docs/architecture/touch-controls.md | MEDIUM |
| NPC Dialogue Tree Format | dialogues.json | MEDIUM |
| Governor AI | PlayerGovernor.ts | MEDIUM |

#### 0.4 Fix outdated references

| File | Issue | Fix |
|------|-------|-----|
| architecture/overview.md | "localStorage" | "expo-sqlite via drizzle-orm" |
| architecture/state-management.md | "localStorage" | "expo-sqlite via drizzle-orm" |
| architecture/performance.md | Historical localStorage ref | Clarify current persistence |

---

### Phase 1: Tests

Current: ~1,057 tests passing. Massive gaps in UI, hooks, and store subsystems.

#### 1.1 Critical hook tests (0% coverage)

| Hook | Lines | What to test |
|------|-------|-------------|
| useGameLoop | 400 | System execution order, frame capping, NPC AI tick |
| useWorldLoader | 58 | Zone loading, entity creation, transitions |
| usePersistence | 131 | Save trigger, restore flow, field exclusion |

#### 1.2 Store subsystem tests (0% coverage)

| Area | Tests needed |
|------|-------------|
| Economy | recordMarketTrade, updateEconomy, purchaseMerchantOffer (~15) |
| Events | tickEvents, advanceEventChallenge, resolveEncounter (~15) |
| Codex | trackSpeciesPlanting/Growth/Harvest, consumePendingCodexUnlock (~12) |
| Quest Chains | refreshAvailableChains, startQuestChain, advanceObjective (~15) |

#### 1.3 UI component tests (3/43 = 7%)

Priority: HUD, PauseMenu, MainMenu, ActionButton, ToolBelt, StaminaGauge, XPBar, TimeDisplay, ResourceBar, SeedSelect.

#### 1.4 New system tests

| System | What to test |
|--------|-------------|
| Procedural world generation | Terrain height determinism, path connectivity, instance counts |
| InstancedBatch | Matrix setup, geometry separation, disposal |
| Chibi NPC | Appearance determinism, walk animation, path following |
| View model juice | Sway response, bob amplitude, reduced motion |
| Custom joystick | Displacement normalization, clamping, dead zone |

#### 1.5 Maestro E2E flows

| Flow | Steps |
|------|-------|
| New game | Launch -> New Game -> difficulty -> seed -> start |
| Plant tree | Select trowel -> look at soil -> USE -> select species |
| Harvest | Select axe -> look at mature tree -> USE -> resources increment |
| Zone transition | Walk to boundary -> fade -> new zone |
| Level up | Gain XP -> level up -> tool unlock |

---

### Phase 2: Wire Orphaned Systems + Fix Broken Flow

#### 2.1 Wire 7 orphaned systems

| System | Wire to |
|--------|---------|
| AudioManager | Game events: plant, harvest, level up, achievement, UI |
| NativeAudioManager | Bridge layer over AudioManager |
| discovery | useWorldLoader on zone enter |
| gridGeneration | WorldGenerator for procedural zones |
| recipes | Store + CraftingUI component |
| seasonalMarket | Trading price calculations |
| zoneBonuses | Growth system as bonus multiplier |

#### 2.2 Fix broken user flow

| Issue | Fix |
|-------|-----|
| No new game modal | Wire NewGameModal to MainMenu "New Game" button |
| No difficulty selection | Wire difficulty picker to store |
| No seed input | Wire seed input to store.setWorldSeed() |
| No loading screen | Create LoadingScreen component (~100 lines) |
| No tutorial | Wire TutorialOverlay to game start (!hasSeenRules) |
| Can't leave starting zone | Wire zone boundary detection + transition |

#### 2.3 Fix Math.random() violations

Replace 5 instances in PlayerGovernor.ts and NpcBrain.ts with scopedRNG calls.

#### 2.4 Create missing config files

| File | Contents |
|------|----------|
| config/game/time.json | Day/season length, period boundaries |
| config/game/economy.json | Supply/demand, merchant, market params |
| config/game/recipes.json | 24 crafting recipes |
| config/game/toolVisuals.json | Per-tool FPS view model config |
| config/game/viewModelJuice.json | Sway, bob, sprint FOV params |
| config/game/input.json | Sensitivity, deadzone, reach |
| config/game/ai.json | Governor + NPC behavior constants |
| config/game/npcAppearance.json | Skin tones, cloth colors, scale/speed |
| config/game/zones.json | Per-zone-type terrain profiles |
| config/game/biomes.json | Material colors per biome per season |

---

### Phase 3: FPS Perspective Pivot

#### 3.1 Input System

| Task | File |
|------|------|
| Create InputActions.ts | game/input/InputActions.ts |
| Create InputManager.ts | game/input/InputManager.ts |
| Create KeyboardMouseProvider | game/input/providers/KeyboardMouseProvider.ts |
| Create TouchProvider (custom joystick) | game/input/providers/TouchProvider.ts |
| Create AIProvider | game/input/providers/AIProvider.ts |
| Wire into game loop, delete useInput.ts | game/hooks/useGameLoop.ts |

#### 3.2 Player Controller

| Task | File |
|------|------|
| Create PlayerController.tsx | components/player/PlayerController.tsx |
| Add mouse look + look zone to providers | providers |
| Replace Camera.tsx + Player.tsx | app/game/index.tsx |

#### 3.3 Tool View Model

| Task | File |
|------|------|
| Create toolVisuals.json | config/game/toolVisuals.json |
| Create ToolViewModel.tsx with GLBs | components/player/ToolViewModel.tsx |
| Implement use animations | ToolViewModel.tsx |
| Implement switch animation | ToolViewModel.tsx |
| Implement sway/bob/sprint FOV juice | ToolViewModel.tsx |

#### 3.4 Raycast Interaction

| Task | File |
|------|------|
| Refactor useInteraction to center-screen raycast | game/hooks/useInteraction.ts |
| Create Crosshair.tsx | components/player/Crosshair.tsx |
| Create TargetInfo.tsx | components/player/TargetInfo.tsx |

#### 3.5 Procedural World (R3F)

| Task | File |
|------|------|
| Create terrain.ts | game/world/terrain.ts |
| Create pathGenerator.ts | game/world/pathGenerator.ts |
| Create instanceCollector.ts | game/world/instanceCollector.ts |
| Create plotPlacer.ts | game/world/plotPlacer.ts |
| Create InstancedBatch.tsx | components/scene/InstancedBatch.tsx |
| Create SharedGeometries.tsx | components/scene/SharedGeometries.tsx |
| Create Terrain.tsx (R3F) | components/scene/Terrain.tsx |
| Create WorldInstances.tsx | components/scene/WorldInstances.tsx |

#### 3.6 Chibi NPCs

| Task | File |
|------|------|
| Create ChibiNpc.tsx | components/entities/ChibiNpc.tsx |
| Update NpcMeshes.tsx | components/entities/NpcMeshes.tsx |
| Create npcAppearance.json | config/game/npcAppearance.json |

#### 3.7 HUD Adaptation

| Task | File |
|------|------|
| Create VirtualJoystick.tsx (custom) | game/ui/VirtualJoystick.tsx |
| Create ActionButtons.tsx | game/ui/ActionButtons.tsx |
| Redesign HUD.tsx for FPS layout | game/ui/HUD.tsx |

---

### Phase 4: Monolith Decomposition

See Appendix D for full decomposition plans.

Priority order:
1. gameStore.ts (1083 lines) -> 6 slices
2. quests.ts (995 lines) -> extract goal pools to JSON
3. recipes.ts (535 lines) -> move recipes to JSON
4. PauseMenu.tsx (755 lines) -> 3 tab components
5. codex.ts (433 lines) -> move lore to JSON
6. treeGeometry.ts (950 lines) -> trunk/branch/leaf builders

---

### Phase 5: UI/UX Wiring

Wire all 25 orphaned UI components. Complete user flow end-to-end:

```
App Launch -> Load fonts, init persistence
  -> Main Menu (Logo + FarmerMascot + buttons)
     -> [Continue] -> game (if save exists)
     -> [New Game] -> NewGameModal (difficulty + seed)
        -> LoadingScreen (world gen progress)
           -> Game Screen
              -> TutorialOverlay (if !hasSeenRules)
              -> FPS gameplay + HUD
```

Centralize colors from `config/theme.json`. Replace all hardcoded hex.

---

### Phase 6: Polish & Ship

#### 6.1 Audio wiring

Wire AudioManager to game events: plant, water, harvest, level up, achievement, UI button.

#### 6.2 Haptics recovery (from BabylonJS archive)

Recover missing haptic patterns: `hapticSelection()`, `hapticWarning()`, `hapticError()`.

#### 6.3 Performance verification

| Metric | Target |
|--------|--------|
| FPS mobile | >= 55 |
| FPS desktop | >= 60 |
| Time to interactive | < 3s |
| Memory mobile | < 100 MB |
| Draw calls | < 50 |
| Bundle size (initial) | < 200 KB |

#### 6.4 Template mesh caching (from BabylonJS archive)

Recover TreeMeshManager template cache pattern -- cache per (speciesId, season, night) combo. Set `matrixAutoUpdate = false` on stage 4 static trees.

#### 6.5 Offline growth feedback

Add "Welcome back!" toast with growth summary on app resume.

---

<a id="appendix-a"></a>
## Appendix A: File-Level Inventory

### Systems: Wired vs Orphaned

| Status | Count | Files |
|--------|-------|-------|
| Wired | 23 | time, weather, growth, harvest, stamina, npcMovement, wildTreeRegrowth, achievements, pathfinding, pathFollowing, prestige, levelUnlocks, toolUpgrades, trading, gridExpansion, quests, speciesDiscovery, marketEvents, haptics, offlineGrowth, saveLoad, travelingMerchant, supplyDemand |
| Orphaned | 7 | AudioManager, NativeAudioManager, discovery, gridGeneration, recipes, seasonalMarket, zoneBonuses |
| Test-only | 2 | PlayerGovernor, questChainEngine |

### Test Coverage

| Category | Tested/Total | Coverage |
|----------|-------------|----------|
| Systems | 30/30 | 100% |
| Store | 1/1 (subsystem gaps) | ~70% |
| Config | 4/4 | 100% |
| Hooks | 4/7 | 57% |
| Actions | 1/1 | 100% |
| AI/NPCs | 3/3 | 100% |
| ECS | 2/3 | 67% |
| World | 3/4 | 75% |
| DB | 2/5 | 40% |
| UI components | 3/43 | 7% |
| Scene components | 0/5 | 0% |
| Entity components | 0/3 | 0% |

---

<a id="appendix-b"></a>
## Appendix B: Config Gaps

### Existing config files (18, all complete)

`config/game/`: species, tools, resources, growth, weather, achievements, prestige, grid, npcs, difficulty, dialogues, quests (12)
`config/world/`: starting-world, blocks, structures, encounters, festivals (5)
`config/theme.json` (1)

### Config files to create (10 new)

| File | Priority | Contents |
|------|----------|----------|
| config/game/time.json | HIGH | Day/season length, period boundaries |
| config/game/economy.json | HIGH | Supply/demand, merchant, market params |
| config/game/recipes.json | HIGH | 24 crafting recipes (from recipes.ts) |
| config/game/toolVisuals.json | HIGH | Per-tool FPS view model config |
| config/game/viewModelJuice.json | HIGH | Sway, bob, sprint FOV params |
| config/game/input.json | MEDIUM | Sensitivity, deadzone, reach |
| config/game/ai.json | MEDIUM | Governor + NPC behavior constants |
| config/game/npcAppearance.json | MEDIUM | Skin tones, cloth colors, scale/speed |
| config/game/zones.json | MEDIUM | Per-zone terrain profiles, density |
| config/game/biomes.json | MEDIUM | Material colors per biome per season |

### Config data to externalize from TypeScript

| Source | Constant | Destination |
|--------|----------|-------------|
| codex.ts (433 lines) | Species lore | config/game/species-lore.json |
| recipes.ts (535 lines) | 24 recipes | config/game/recipes.json |
| time.ts | Day/season lengths | config/game/time.json |
| stamina.ts | Regen rate | tools.json stamina section |
| harvest.ts | Stage/pruned multipliers | species.json |
| offlineGrowth.ts | Max offline seconds | growth.json offline section |

---

<a id="appendix-c"></a>
## Appendix C: BabylonJS Archive Recovery

Archive location: `/Users/jbogaty/src/arcade-cabinet/grovekeeper-babylonjs-archive/`

### High Priority Recovery

| Feature | Archive source | Why |
|---------|---------------|-----|
| Template mesh caching | TreeMeshManager.ts:20-73 | 30-50% perf improvement on 50+ trees |
| World matrix freezing | TreeMeshManager.ts:117-122 | Skip matrix math on static stage 4 trees |
| Selection haptics | platform.ts:145-227 | Mobile UX: hapticSelection(), hapticWarning(), hapticError() |
| 35 achievements | achievements config | Archive has 2x current achievements |
| Integration tests | integration.test.ts (631 lines) | Full gameplay flow validation |

### Medium Priority

| Feature | Archive source | Why |
|---------|---------------|-----|
| Path following state machine | InputManager.ts:140-153 | Clean tap-to-move pattern |
| Jiggle walk animation | PlayerMeshManager.ts:190-261 | Battle-tested character animation |
| Governor E2E test | governor.e2e.test.ts | Bot gameplay validation |
| More zone definitions | starting-world.json (8 zones) | Archive has more zones than current 5 |

### Low Priority (Future Features)

| Feature | Archive source | Notes |
|---------|---------------|-------|
| Crop disease system | difficulty config | Hard+ difficulty only |
| Exposure/cold | difficulty config | Hardcore mode |
| Building degradation | difficulty config | Brutal+ only |

### Already Ported Successfully

All core systems (growth, weather, achievements, prestige, stamina, harvest, pathfinding, save/load, time, quests, trading, species discovery, market events) -- verified matching or improved in current codebase.

---

<a id="appendix-d"></a>
## Appendix D: Monolith Decomposition Plans

### gameStore.ts (1083 lines) -> 6 slices

```
stores/
  gameStore.ts          -- Re-exports combined store
  slices/
    progressionSlice.ts -- Level, XP, unlocks
    economySlice.ts     -- Resources, trading, market
    structureSlice.ts   -- Structures, grid expansion
    discoverySlice.ts   -- Species codex, achievements
    questSlice.ts       -- Quests, quest chains, NPCs
    settingsSlice.ts    -- Audio, haptics, difficulty, UI prefs
```

### quests.ts (995 lines) -> config + generator

```
config/game/quest-pools.json  -- 150+ goal templates organized by 9 pools
systems/quests.ts             -- Generation + tracking logic (~300 lines)
```

### PauseMenu.tsx (755 lines) -> 3 tabs

```
ui/PauseMenu.tsx       -- Shell with tab switching (~100 lines)
ui/pause/StatsTab.tsx  -- Player stats + resource totals
ui/pause/ProgressTab.tsx -- Achievements, prestige, grid expansion
ui/pause/SettingsTab.tsx -- Audio, haptics, UI settings
```

### recipes.ts (535 lines) -> config + functions

```
config/game/recipes.json    -- 24 recipe definitions
systems/recipes.ts          -- Crafting functions (~100 lines)
```

### treeGeometry.ts (950 lines) -> builders

```
utils/treeGeometry/
  index.ts            -- Re-exports
  trunkBuilder.ts     -- Trunk geometry generation
  branchBuilder.ts    -- Branch geometry generation
  leafBuilder.ts      -- Leaf/canopy generation
  merger.ts           -- Combines trunk + branches + leaves
```

---

## Execution Order

Phases are ordered for the docs-first pipeline:

1. **Phase 0** -- Make GAME_SPEC.md comprehensive
2. **Phase 1** -- Write all tests against spec (many will fail)
3. **Phase 2** -- Wire orphaned systems, fix broken flow (tests start passing)
4. **Phase 3** -- FPS pivot: input, camera, tools, world gen, chibi NPCs, HUD
5. **Phase 4** -- Decompose monoliths (refactoring, not new features)
6. **Phase 5** -- Wire all UI components, complete user flow
7. **Phase 6** -- Audio, haptics, performance, polish, ship

Each phase follows: **spec -> architecture doc -> tests -> implementation -> wire -> verify -> update status**.
