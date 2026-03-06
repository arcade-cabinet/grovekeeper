# Grovekeeper Migration Design: BabylonJS/Vite to Expo/R3F

**Date:** 2026-03-06
**Status:** Approved
**Approach:** Clean room (Approach A) — new Expo project, port from archive

## Migration Summary

| Out | In |
|-----|-----|
| BabylonJS 8.x (imperative) | React Three Fiber + drei (declarative) |
| Vite 6.x + Capacitor 8.x | Expo SDK 55 (web + iOS + Android) |
| Vitest 4.x + happy-dom | Jest (Expo default) |
| Playwright (E2E only) | Maestro (mobile E2E) |
| shadcn/ui + 20 Radix packages | React Native Reusables + NativeWind |
| sql.js + WASM copy hack | expo-sqlite (native + web WASM built-in) |
| Tailwind CSS 4.x (web-only) | NativeWind 4.x (universal) |
| Scattered constants/*.ts | Organized JSON config hierarchy |

### What Stays

- **Miniplex 2.x** — ECS (engine-agnostic)
- **Zustand 5.x** — persistent state (engine-agnostic)
- **Yuka 0.7.x** — NPC AI brains (engine-agnostic)
- **drizzle-orm** — re-wired to expo-sqlite
- **Biome** — lint + format
- **Game logic** — all pure systems port verbatim

## Architecture

### Scene Decomposition (Hybrid: domain groups + individual components)

```
<Canvas> (R3F)
  <WorldScene>
    <Camera />           — PerspectiveCamera, follows player
    <Lighting />         — ambient + directional, day/night sync
    <Sky />              — HDRI skybox or drei Sky
    <Ground />           — biome-blended ground plane
  </WorldScene>
  <EntityLayer>
    <Player />           — player mesh + useFrame movement
    <TreeInstances />    — instanced trees, growth animation via useFrame
    <NpcMeshes />        — NPC meshes + Yuka brain integration
    <Structures />       — structure block meshes
    <BorderTrees />      — decorative border trees
  </EntityLayer>
  <InteractionLayer>
    <SelectionRing />    — torus highlight on tap target
    <PlacementGhost />   — translucent structure preview
  </InteractionLayer>
</Canvas>
```

Each component owns its `useFrame` hook for per-frame logic. No monolithic game loop.

### Config Structure (JSON-driven, Metro static imports)

```
config/
  theme.json             — colors, typography, spacing -> NativeWind theme
  game/
    species.json         — 15 tree species catalog
    tools.json           — 8 tools + stamina costs
    resources.json       — resource type definitions
    growth.json          — stage names, multipliers, timing
    weather.json         — event probabilities, multipliers
    achievements.json    — trigger conditions, display data
    prestige.json        — tiers, bonuses, cosmetic themes
    grid.json            — expansion tiers, costs, sizes
    npcs.json            — NPC template definitions (exists)
    dialogues.json       — dialogue trees (exists)
    quests.json          — quest chain definitions (exists)
    difficulty.json      — difficulty multipliers (exists)
  world/
    starting-world.json  — zone definitions (exists)
    blocks.json          — block catalog (exists)
    structures.json      — structure recipes (exists)
    encounters.json      — random encounters (exists)
    festivals.json       — seasonal festivals (exists)
```

### SPS Tree Generator Port

Full rewrite of `spsTreeGenerator.ts` from BabylonJS SolidParticleSystem to Three.js BufferGeometry + InstancedMesh. Same seeded RNG (`seedRNG.ts`), same species parameters, Three.js primitives. `treeMeshBuilder.ts` becomes R3F components returning `<mesh>` JSX.

### Database Layer

```
sql.js + WASM copy     -->  expo-sqlite (native SQLite + web WASM)
manual WASM loading     -->  expo-sqlite plugin handles everything
drizzle + sql.js driver -->  drizzle + expo-sqlite driver
```

Headers already configured in app.json (`Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`).

### Styling

All inline `style={{}}` objects and `COLORS` constants migrate to NativeWind classes. Design tokens defined in `config/theme.json`, consumed by `tailwind.config.js` theme extension. Game-specific tokens:

```
text-forest-green, bg-bark-brown, bg-soil-dark, text-leaf-light,
text-autumn-gold, bg-sky-mist, border-bark-brown, etc.
```

Computed values (dynamic opacity, position calculations) use NativeWind's arbitrary value syntax or minimal inline styles.

### Testing Strategy

| Layer | Tool | What | From Archive |
|-------|------|------|-------------|
| Unit | Jest | Pure functions (growth, grid, RNG, config) | Migrate ~30 test files |
| E2E | Maestro | Full game flows, Yuka governor autopilot | Rewrite from scratch |

Old Vitest tests triaged:
- **Pure function tests** (growth, weather, stamina, pathfinding, etc.) — migrate to Jest verbatim
- **Mock-heavy behavioral tests** — replace with Maestro flows
- **Component render tests** — replace with Maestro component flows

### Yuka PlayerGovernor E2E

The existing `PlayerGovernor` + `GovernorAgent` + `HeadlessGameLoop` is a shallow mock. The new version:
- Runs as a real Maestro flow against the actual app
- Yuka GoalEvaluator drives autonomous play: plant, tend, harvest, expand, explore zones, prestige
- Validates game state progression at each milestone
- Catches regressions in the full game loop, not just isolated systems

### CI/CD Pipeline

```
ci.yml          — PR: lint + typecheck + jest unit tests
cd.yml          — push to main: full build verification (web + android)
release.yml     — on GitHub release: deploy web to Pages + build debug APKs
                   (arm64-v8a, armeabi-v7a, x86_64)
automerge.yml   — nightly schedule + workflow_dispatch: merge release-please
                   and dependabot PRs without triggering CI
dependabot.yml  — grouped PRs, skip actions, weekly schedule
```

- `release-please` with conventional commits, `CI_GITHUB_TOKEN`
- Android builds via Expo CLI + Gradle on GHA runners (no EAS)
- PR labels: `autorelease: pending`, `autorelease: tagged`, `dependencies`

### Asset Loading (DRY, web + native)

GLB models loaded via `useGLTF` from `@react-three/drei`. Asset resolution:
- **Native:** Expo asset system resolves from `assets/models/`
- **Web:** Metro bundles and serves from same path
- Single `require()` or `Asset.fromModule()` call works on both platforms

## Source File Migration Map

### Engine-Agnostic (port verbatim, change imports only)

```
systems/growth.ts          systems/achievements.ts
systems/weather.ts         systems/stamina.ts
systems/time.ts            systems/harvest.ts
systems/gridExpansion.ts   systems/gridGeneration.ts
systems/levelUnlocks.ts    systems/offlineGrowth.ts
systems/prestige.ts        systems/quests.ts
systems/recipes.ts         systems/trading.ts
systems/seasonalMarket.ts  systems/toolUpgrades.ts
systems/discovery.ts       systems/wildTreeRegrowth.ts
systems/zoneBonuses.ts     systems/supplyDemand.ts
systems/marketEvents.ts    systems/travelingMerchant.ts
systems/speciesDiscovery.ts systems/pathfinding.ts
systems/pathFollowing.ts   systems/npcMovement.ts
systems/saveLoad.ts        systems/tutorialController.ts
ecs/world.ts               ecs/archetypes.ts
stores/gameStore.ts        utils/gridMath.ts
utils/seedRNG.ts           ai/NpcBrain.ts
ai/PlayerGovernor.ts       npcs/NpcManager.ts
npcs/types.ts              quests/*
events/*                   world/types.ts
world/WorldGenerator.ts    world/ZoneLoader.ts
world/archetypes.ts        structures/types.ts
actions/GameActions.ts
```

### Needs Rewrite (BabylonJS -> R3F/Three.js)

```
scenes/GameScene.tsx        -> app/(game)/index.tsx + R3F components
scene/SceneManager.ts       -> deleted (Canvas handles this)
scene/CameraManager.ts      -> components/scene/Camera.tsx
scene/LightingManager.ts    -> components/scene/Lighting.tsx
scene/GroundBuilder.ts      -> components/scene/Ground.tsx
scene/SkyManager.ts         -> components/scene/Sky.tsx
scene/PlayerMeshManager.ts  -> components/entities/Player.tsx
scene/TreeMeshManager.ts    -> components/entities/TreeInstances.tsx
scene/NpcMeshManager.ts     -> components/entities/NpcMeshes.tsx
scene/BorderTreeManager.ts  -> components/entities/BorderTrees.tsx
scene/SelectionRingManager  -> components/interaction/SelectionRing.tsx
scene/ModelLoader.ts        -> useGLTF (drei)
structures/BlockMeshFactory -> components/entities/StructureMesh.tsx
structures/StructureManager -> rewrite for R3F context
world/WorldManager.ts       -> rewrite for R3F context
world/PropFactory.ts        -> components/entities/Props.tsx
utils/spsTreeGenerator.ts   -> utils/treeGeometry.ts (Three.js BufferGeometry)
utils/treeMeshBuilder.ts    -> components/entities/TreeMesh.tsx
utils/worldToScreen.ts      -> useThree + project (drei)
utils/projection.ts         -> useThree + project (drei)
systems/InputManager.ts     -> hooks/useInput.ts (RN gesture handler)
systems/movement.ts         -> hooks/useMovement.ts (useFrame)
systems/AudioManager.ts     -> expo-av based
systems/platform.ts         -> expo-haptics
```

### UI Rewrite (shadcn/web -> React Native Reusables)

All 30+ UI components in `ui/` rewritten with RN Reusables + NativeWind. No DOM APIs (`document.*`, `window.*`, CSS animations). Use Reanimated for animations.

## Non-Goals

- No EAS (GitHub Actions handles all builds)
- No backwards compatibility with BabylonJS codebase
- No incremental migration — clean room only
- No iOS builds in CI yet (requires Apple Developer account)
