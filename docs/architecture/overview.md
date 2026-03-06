# Architecture Overview

Grovekeeper is a cozy 2.5D isometric tree-planting simulation and idle tending game. It is built as a mobile-first app (portrait orientation) with desktop web as a secondary target. Sessions are designed around 3-15 minute commute-friendly play.

## Tech Stack

| Layer           | Technology                       | Version   | Notes                                      |
|-----------------|----------------------------------|-----------|--------------------------------------------|
| App Framework   | Expo SDK                         | 55        | Universal: web + iOS + Android             |
| 3D Engine       | React Three Fiber + drei         | --        | Declarative R3F scene via React components |
| ECS             | Miniplex                         | 2.x       | Entity-component-system for runtime state  |
| State Mgmt      | Zustand                          | 5.x       | Persistent player state via localStorage   |
| NPC AI          | Yuka                             | 0.7.x     | Goal-driven NPC brains                     |
| Database        | expo-sqlite + drizzle-orm        | --        | Native SQLite + web WASM                   |
| Styling         | NativeWind 4.x + RN Reusables   | 4.x       | Universal Tailwind (web + native)          |
| Language        | TypeScript                       | 5.7+      | Strict mode                                |
| Lint / Format   | Biome                            | 2.3       | Single tool for lint + format              |
| Package Mgr     | pnpm                             | 9+        | Fast, strict dependency resolution         |
| Testing         | Jest (unit) + Maestro (E2E)      | --        | Expo default runner + mobile E2E           |

### Evolution from Original Stack

The project was originally built with BabylonJS (imperative) + Vite + Capacitor. It is being migrated to a declarative architecture:

- **React Three Fiber** replaces BabylonJS -- scene is React components, not imperative manager classes
- **Expo SDK** replaces Vite + Capacitor -- single framework for web, iOS, and Android
- **NativeWind** replaces Tailwind CSS (web-only) -- universal styling across platforms
- **expo-sqlite** replaces sql.js -- native SQLite on mobile, built-in WASM on web
- **Jest + Maestro** replaces Vitest + Playwright -- Expo-native testing
- **JSON config files** replace scattered TypeScript constants -- data-driven game balance

Engine-agnostic code (Miniplex ECS, Zustand store, pure game systems, Yuka AI) ports verbatim.

## Directory Layout

```text
src/
  game/
    ecs/
      world.ts                  Miniplex World, Entity interface, queries
      archetypes.ts             Entity factory functions
    systems/                    Pure game systems (engine-agnostic)
      growth.ts                 5-stage tree growth
      movement.ts               Player movement
      time.ts                   Day/night cycle + seasons
      weather.ts                Weather events (rain/drought/windstorm)
      harvest.ts                Resource harvesting from mature trees
      stamina.ts                Stamina drain on actions, passive regen
      achievements.ts           15 achievement triggers
      prestige.ts               Level 25+ prestige with permanent bonuses
      gridExpansion.ts          Grid size upgrades (12 -> 16 -> 20 -> 24 -> 32)
      gridGeneration.ts         Procedural grid generation (soil/water/rock/path)
      levelUnlocks.ts           Level-based species and tool unlocks
      offlineGrowth.ts          Offline growth calculation on resume
      saveLoad.ts               ECS serialization to/from storage
      quests.ts                 Quest/goal generation and tracking
      recipes.ts                Crafting recipe system
      trading.ts                Resource trading
      seasonalMarket.ts         Seasonal market prices
      toolUpgrades.ts           Tool upgrade progression
      discovery.ts              Species discovery
      wildTreeRegrowth.ts       Wild tree respawn
      zoneBonuses.ts            Per-zone bonus effects
      supplyDemand.ts           Supply/demand pricing
      marketEvents.ts           Market event system
      travelingMerchant.ts      Traveling merchant
      speciesDiscovery.ts       Species discovery system
      pathfinding.ts            A* grid pathfinding
      pathFollowing.ts          Waypoint interpolation
    stores/
      gameStore.ts              Zustand persistent state (all player data)
    ai/                         Yuka NPC AI brains
    npcs/                       NPC management
    quests/                     Quest chain system
    events/                     Event system
    world/                      World generation, zone loading
    structures/                 Structure placement + effects
    actions/                    Game action dispatcher
    utils/
      treeGeometry.ts           Three.js BufferGeometry tree generation
      gridMath.ts               Grid coordinate utilities
      seedRNG.ts                Seeded pseudo-random number generator
  components/
    scene/                      R3F scene components
      Camera.tsx                PerspectiveCamera, follows player
      Lighting.tsx              Ambient + directional, day/night sync
      Sky.tsx                   HDRI skybox or drei Sky
      Ground.tsx                Biome-blended ground plane
    entities/                   R3F entity components
      Player.tsx                Player mesh + useFrame movement
      TreeInstances.tsx         Instanced trees, growth animation via useFrame
      NpcMeshes.tsx             NPC meshes + Yuka brain integration
      Structures.tsx            Structure block meshes
      BorderTrees.tsx           Decorative border trees
    interaction/                R3F interaction layer
      SelectionRing.tsx         Torus highlight on tap target
      PlacementGhost.tsx        Translucent structure preview
    ui/                         React Native UI components (30+ screens/panels)
  hooks/
    useInput.ts                 Unified input (gesture handler + keyboard)
    useMovement.ts              Player movement via useFrame
config/                         JSON config hierarchy (game balance, theme)
```

## Data Flow

The application has two parallel state systems connected through React context and hooks within R3F components.

```text
                          localStorage / expo-sqlite
                              |
                     zustand/persist middleware
                              |
React Native UI Layer        Zustand Store (gameStore.ts)
(HUD, Menus, Dialogs) <---> (level, XP, coins, resources,
                              unlocks, achievements, settings,
                              grove serialization)
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

3. **Zustand holds persistent data.** Player level, XP, resources, achievements, and serialized grove data are stored in Zustand with `persist` middleware.

4. **Systems are pure functions.** Each system follows the signature `(world, deltaTime, ...context) => void`. They are called from `useFrame` hooks inside R3F components.

5. **Config is JSON-driven.** All game balance data (species, tools, growth rates, achievements) lives in `config/` JSON files, imported statically via Metro.

## Entry Point Chain

```text
app/_layout.tsx           -- Expo Router root layout
  app/(menu)/index.tsx    -- Main menu screen
  app/(game)/index.tsx    -- Game screen with R3F Canvas
    <Canvas>
      <WorldScene />      -- Camera, Lighting, Sky, Ground
      <EntityLayer />     -- Player, Trees, NPCs, Structures
      <InteractionLayer />-- Selection ring, placement ghost
    </Canvas>
    <GameUI />            -- HUD overlay (React Native)
```

The game screen is loaded on navigation from the menu, enabling natural code splitting via Expo Router.
