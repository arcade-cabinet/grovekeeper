# Architecture Overview

Grovekeeper is a cozy 2.5D isometric tree-planting simulation and idle tending game. It is built as a mobile-first PWA (portrait orientation) with desktop as a secondary target. Sessions are designed around 3-15 minute commute-friendly play.

## Tech Stack

| Layer           | Technology                       | Version   | Notes                                      |
|-----------------|----------------------------------|-----------|--------------------------------------------|
| UI Framework    | React                            | 19.x      | Component model, UI layer                  |
| 3D Engine       | BabylonJS                        | 8.50.x    | Imperative scene rendering, procedural meshes |
| ECS             | Miniplex                         | 2.x       | Entity-component-system for runtime state  |
| State Mgmt      | Zustand                          | 5.x       | Persistent player state via localStorage   |
| Mobile Input    | nipplejs                         | 0.10.x    | Virtual joystick for touch controls        |
| Styling         | Tailwind CSS 4.x + shadcn/ui    | 4.x       | Utility-first CSS + Radix-based components |
| Bundler         | Vite                             | 6.x       | Fast dev server with HMR                   |
| Language        | TypeScript                       | 5.7+      | ES2020 target, bundler module resolution   |
| Lint / Format   | Biome                            | 2.3       | Single tool for lint + format              |
| Package Mgr     | pnpm                             | 9+        | Fast, strict dependency resolution         |
| Testing         | Vitest + @testing-library/react  | 4.x       | happy-dom environment, 410+ tests          |
| Mobile Native   | Capacitor                        | 8.x       | PWA + native bridge (haptics, device info) |

### Deviation from Original Spec

The implementation intentionally diverges from the canonical spec in several ways:

- **Tailwind CSS + shadcn/ui** replaces the spec's Vanilla CSS + CSS Modules (better DX, consistent components).
- **BabylonJS 8.50.x** instead of 7.x (newer release available at build time).
- **Capacitor 8.x** added for native mobile deployment (not in original spec).
- **Time system** uses microsecond-precision day/night cycle with 12-month seasons (richer than spec's simple 60s/4-day cycle).
- **Quest system** uses goal pools instead of the spec's template-based daily challenges.

These deviations are accepted. Working code is prioritized over spec purity.

## Directory Layout

```
src/
├── main.tsx                        # Application entry point
├── App.tsx                         # Root component, renders Game
├── game/
│   ├── Game.tsx                    # Screen router (menu | playing)
│   ├── scenes/
│   │   └── GameScene.tsx           # BabylonJS canvas + game loop (~1050 lines)
│   ├── ecs/
│   │   ├── world.ts               # Miniplex World, Entity interface, queries
│   │   └── archetypes.ts          # Entity factory functions
│   ├── systems/
│   │   ├── growth.ts              # 5-stage tree growth
│   │   ├── movement.ts            # Player movement (joystick + WASD)
│   │   ├── time.ts                # Day/night cycle + seasons
│   │   ├── weather.ts             # Weather events (rain/drought/windstorm)
│   │   ├── harvest.ts             # Resource harvesting from mature trees
│   │   ├── stamina.ts             # Stamina drain on actions, passive regen
│   │   ├── achievements.ts        # 15 achievement triggers
│   │   ├── prestige.ts            # Level 25+ prestige with permanent bonuses
│   │   ├── gridExpansion.ts       # Grid size upgrades (12 -> 16 -> 20 -> 24 -> 32)
│   │   ├── gridGeneration.ts      # Procedural grid generation (soil/water/rock/path)
│   │   ├── levelUnlocks.ts        # Level-based species and tool unlocks
│   │   ├── offlineGrowth.ts       # Offline growth calculation on resume
│   │   ├── saveLoad.ts            # ECS serialization to/from localStorage
│   │   ├── quests.ts              # Quest/goal generation and tracking
│   │   └── platform.ts            # Capacitor haptics bridge
│   ├── stores/
│   │   └── gameStore.ts           # Zustand persistent state (all player data)
│   ├── constants/
│   │   ├── config.ts              # Grid size, colors, growth stages, multipliers
│   │   ├── trees.ts               # 11 tree species (8 base + 3 prestige)
│   │   ├── tools.ts               # 8 tool definitions with stamina costs
│   │   └── resources.ts           # 4 resource types (timber, sap, fruit, acorns)
│   ├── utils/
│   │   ├── spsTreeGenerator.ts    # Ported SPS Tree Generator (TypeScript + seeded RNG)
│   │   ├── treeMeshBuilder.ts     # Species-specific PBR meshes + seasonal tints
│   │   ├── gridMath.ts            # Grid coordinate utilities
│   │   └── seedRNG.ts             # Seeded pseudo-random number generator
│   ├── hooks/
│   │   └── useKeyboardInput.ts    # Desktop WASD + number key input
│   ├── ui/                        # 23 UI components (HUD, menus, overlays)
│   └── types.ts                   # Core type definitions (legacy, see ecs/world.ts)
├── components/ui/                 # shadcn/ui primitive components
├── hooks/                         # use-mobile, use-media-query
└── lib/
    └── utils.ts                   # cn() Tailwind merge utility
```

## Data Flow

The application has two parallel state systems that communicate through React refs and callbacks in `GameScene.tsx`.

```
                          localStorage
                              |
                     zustand/persist middleware
                              |
React UI Layer               Zustand Store (gameStore.ts)
(HUD, Menus, Dialogs) <---> (level, XP, coins, resources,
                              unlocks, achievements, settings,
                              grove serialization)
       |
       | React refs + callbacks
       |
BabylonJS Scene              Miniplex ECS World (world.ts)
(3D rendering,         <---> (entity positions, tree growth
 camera, lighting)            progress, grid cell state,
                              player position)
       |
       | engine.runRenderLoop (every frame)
       |
Systems Layer
(growth, movement, time, weather, harvest, stamina)
```

### Key Architectural Boundaries

1. **BabylonJS operates outside React's render cycle.** All mesh references are stored in React refs, not React state. The 3D engine runs its own render loop independently.

2. **ECS holds per-frame data.** Entity positions, growth progress, and tile occupancy live in Miniplex. This data changes every frame and does not need persistence.

3. **Zustand holds persistent data.** Player level, XP, resources, achievements, and serialized grove data are stored in Zustand with `persist` middleware writing to `localStorage`.

4. **Systems are pure functions.** Each system follows the signature `(world, deltaTime, ...context) => void` and runs every frame inside the game loop in `GameScene.tsx`.

5. **GameScene.tsx is the integration point.** At ~1050 lines, it is the single file where ECS, BabylonJS, Zustand, and UI all converge. Only one agent should modify it at a time during parallel development.

## Entry Point Chain

```
src/main.tsx
  -> App.tsx (root component)
    -> Game.tsx (screen router: "menu" | "playing")
      -> MainMenu.tsx (start screen)
      -> GameScene.tsx (lazy-loaded, BabylonJS canvas + game loop)
        -> GameUI.tsx (HUD overlay + joystick + dialogs)
```

`GameScene.tsx` is dynamically imported to enable code splitting, keeping the initial bundle at approximately 107 KB gzipped while the full game loads at approximately 500 KB.
