# Architecture Overview

> **PARTIALLY SUPERSEDED (2026-03-07):** Several details in this document are outdated. See `docs/plans/2026-03-07-unified-game-design.md` for the current design. Key corrections:
>
> - **Not "2.5D isometric"** -- Grovekeeper is a **first-person** grove-tending survival game with FPS perspective (held tool model, WASD + mouse look / virtual joystick).
> - **Not "idle tending"** -- it is a survival game. Hearts, hunger, stamina, weather damage, tool durability.
> - **Legend State 3.x** replaces Zustand for persistent state (via expo-sqlite, not localStorage).
> - **No `src/` directory** -- game code lives at `game/`, components at `components/`, config at `config/`.
> - **Trees use 3DPSX GLB models** with scale-per-stage, not procedural SPS geometry.
> - **NPCs use 3DPSX ChibiCharacter GLBs** with anime.js Lego-style animation, not procedural box meshes.
> - **Infinite chunk-based world**, not fixed zones or hex grid.
> - **TypeScript 5.9**, **Biome 2.4**, **Tone.js** for audio.
>
> The R3F declarative architecture, ECS patterns, code-splitting strategy, and system purity rules remain accurate.

Grovekeeper is a first-person grove-tending survival game. It is built as a mobile-first app (portrait-primary) with desktop web as a secondary target. Sessions are designed around 3-15 minute commute-friendly play.

## Tech Stack

| Layer           | Technology                       | Version   | Notes                                      |
|-----------------|----------------------------------|-----------|--------------------------------------------|
| App Framework   | Expo SDK                         | 55        | Universal: web + iOS + Android             |
| 3D Engine       | React Three Fiber 9 + drei 10    | --        | Declarative R3F scene via React components |
| ECS             | Miniplex                         | 2.x       | Entity-component-system for runtime state  |
| State Mgmt      | Legend State                     | 3.x       | Persistent player state via expo-sqlite    |
| NPC AI          | Yuka                             | 0.7.x     | Goal-driven NPC brains                     |
| NPC Animation   | anime.js                         | --        | Lego-style rigid body part rotation        |
| Audio           | Tone.js                          | --        | FM synthesis, spatial audio, HRTF          |
| Database        | expo-sqlite + drizzle-orm        | --        | Native SQLite + web WASM                   |
| Styling         | NativeWind 4.x + RN Reusables   | 4.x       | Universal Tailwind (web + native)          |
| Language        | TypeScript                       | 5.9       | Strict mode                                |
| Lint / Format   | Biome                            | 2.4       | Single tool for lint + format              |
| Package Mgr     | pnpm                             | 9+        | Fast, strict dependency resolution         |
| Testing         | Jest (unit) + Maestro (E2E)      | --        | Expo default runner + mobile E2E           |

### Evolution from Original Stack

The project was originally built with BabylonJS (imperative) + Vite + Capacitor. It has been migrated to a declarative architecture:

- **React Three Fiber** replaces BabylonJS -- scene is React components, not imperative manager classes
- **Expo SDK** replaces Vite + Capacitor -- single framework for web, iOS, and Android
- **Legend State 3.x** replaces Zustand -- observable state with expo-sqlite persistence
- **NativeWind** replaces Tailwind CSS (web-only) -- universal styling across platforms
- **expo-sqlite** replaces sql.js -- native SQLite on mobile, built-in WASM on web
- **Jest + Maestro** replaces Vitest + Playwright -- Expo-native testing
- **JSON config files** replace scattered TypeScript constants -- data-driven game balance
- **3DPSX GLB models** replace procedural SPS geometry -- trees, NPCs, structures, props
- **Tone.js** replaces raw Web Audio -- FM synthesis, spatial audio, ambient soundscapes

Engine-agnostic code (Miniplex ECS, Legend State store, pure game systems, Yuka AI) ports verbatim.

## Directory Layout

```text
app/                              Expo Router screens
  _layout.tsx                     Root layout
  index.tsx                       Main menu
  game/
    index.tsx                     Game screen (Canvas + HUD)

components/                       React Native + R3F components
  ui/                             Base UI (button, text, icon)
  game/                           Game UI (HUD, menus, dialogs)
  scene/                          R3F scene (Camera, Lighting, Sky, Ground)
  entities/                       R3F entities (Player, Trees, NPCs)
  player/                         PlayerController, ToolViewModel, Crosshair

game/                             Game logic (engine-agnostic)
  ecs/                            Miniplex world, archetypes, queries
  systems/                        Pure game systems (growth, weather, etc.)
  stores/                         Legend State persistent store
  hooks/                          Custom hooks (useInput, useMovement, etc.)
  ai/                             Yuka NPC AI + PlayerGovernor
  npcs/                           NPC management
  quests/                         Quest chain engine
  events/                         Event scheduler
  world/                          World generation, chunk loading
  structures/                     Structure placement + effects
  actions/                        Game action dispatcher
  config/                         Runtime config loaders (species, tools, resources)
  constants/                      Codex + derived constants
  db/                             expo-sqlite + drizzle-orm
  utils/                          Pure utilities (seedRNG, etc.)

config/                           JSON config hierarchy
  theme.json                      Colors, typography, spacing
  game/                           Game balance data
    species.json                  15 tree species catalog
    tools.json                    12 tools + stamina costs
    resources.json                Resource type definitions
    growth.json                   Stage names, multipliers, timing
    weather.json                  Event probabilities, multipliers
    achievements.json             Trigger conditions, display data
    prestige.json                 Tiers, bonuses, cosmetic themes
    npcs.json                     NPC template definitions
    dialogues.json                Dialogue trees
    quests.json                   Quest chain definitions
    difficulty.json               Difficulty multipliers

assets/                           Textures, models, fonts
.maestro/                         Maestro E2E test flows
```

## Data Flow

The application has two parallel state systems connected through React context and hooks within R3F components.

```text
                          expo-sqlite
                              |
                     Legend State persistence
                              |
React Native UI Layer        Legend State Store (gameStore.ts)
(HUD, Menus, Dialogs) <---> (level, XP, resources, hearts,
                              hunger, unlocks, achievements,
                              settings, chunk deltas)
       |
       | React context + hooks
       |
R3F Canvas                   Miniplex ECS World (world.ts)
(<Canvas> with scene    <---> (entity positions, tree growth
 components)                   progress, grid cell state,
                               player position)
       |
       | useFrame hooks (every frame)
       |
Systems Layer
(growth, movement, time, weather, harvest, stamina)
```

### Key Architectural Boundaries

1. **R3F components own their per-frame logic.** Each entity component (Player, TreeInstances, etc.) has its own `useFrame` hook. There is no monolithic game loop -- per-frame work is distributed across components.

2. **ECS holds per-frame data.** Entity positions, growth progress, and tile occupancy live in Miniplex. This data changes every frame and does not need direct persistence.

3. **Legend State holds persistent data.** Player level, XP, resources, hearts, hunger, achievements, and chunk deltas are stored in Legend State with expo-sqlite persistence.

4. **Systems are pure functions.** Each system follows the signature `(world, deltaTime, ...context) => void`. They are called from `useFrame` hooks inside R3F components.

5. **Config is JSON-driven.** All game balance data (species, tools, growth rates, achievements) lives in `config/` JSON files, imported statically via Metro.

## Entry Point Chain

```text
app/_layout.tsx           -- Expo Router root layout
  app/index.tsx           -- Main menu screen
  app/game/index.tsx      -- Game screen with R3F Canvas
    <Canvas>
      <ChunkManager />   -- Chunk streaming, terrain, world instances
      <PlayerController />-- FPS camera + Rapier capsule + movement
      <ToolViewModel />   -- First-person held tool model + juice
      <TreeInstances />   -- Per-species instanced tree GLB meshes
      <NpcMeshes />       -- ChibiCharacter GLB NPCs + anime.js animation
      <StructureMeshes /> -- Structure GLB meshes
      <Lighting />        -- Ambient + directional, time-driven
      <Sky />             -- Skybox with seasonal rotation
      <Crosshair />       -- Screen-center crosshair overlay
    </Canvas>
    <GameUI />            -- HUD overlay (React Native)
```

The game screen is loaded on navigation from the menu, enabling natural code splitting via Expo Router.
