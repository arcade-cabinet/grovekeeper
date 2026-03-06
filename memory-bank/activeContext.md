# Active Context -- Grovekeeper

## Current State (2026-03-06)

Migration from BabylonJS to Expo/R3F is well underway. The project has been rebuilt on a new tech stack (Expo SDK 55, React Three Fiber, NativeWind, expo-sqlite) while preserving all game design, ECS patterns, and game logic.

### Archive

The complete BabylonJS implementation is archived at `/Users/jbogaty/src/arcade-cabinet/grovekeeper-babylonjs-archive/` (READ ONLY reference). This was a fully feature-complete implementation with 1188 tests across 58 files, all 32 spec sections implemented.

### New Stack

- **Expo SDK 55** -- Universal app (iOS + Android + Web)
- **React 19.2 + React Native 0.83** -- UI runtime
- **React Three Fiber + @react-three/drei** -- Declarative 3D (replaces BabylonJS)
- **NativeWind 4 + React Native Reusables** -- Styling (replaces shadcn/Radix)
- **expo-sqlite + drizzle-orm** -- Persistence (replaces localStorage)
- **Jest** -- Testing (replaces Vitest)
- **Maestro** -- Mobile E2E (replaces Playwright)
- **Miniplex 2.x** -- ECS (unchanged)
- **Zustand 5.x** -- State management (unchanged)
- **Yuka 0.7.x** -- NPC AI (unchanged)
- **Biome** -- Lint/format (unchanged)

## Active Work

The migration is in progress across multiple phases. Foundation (Phase 0), game systems port (Phase 1), scene components (Phase 2), UI layer (Phase 3), and audio (Phase 4) are underway concurrently. See `memory-bank/progress.md` for detailed phase status.

## What Carries Over (Unchanged)

These game systems are pure logic with no rendering dependency -- they transferred directly:
- ECS world + queries + archetypes (Miniplex)
- Zustand gameStore (state shape, actions, persist middleware adapter)
- Growth system (5-stage, spec formula)
- Weather system (pure functions)
- Achievement system (pure functions)
- Prestige system (pure functions)
- Season/time system
- Stamina system
- Harvest system (late-binding multipliers)
- Quest system
- Grid expansion logic
- Offline growth calculation
- Pathfinding (A*)
- World/zone data layer (types, generator, loader)
- Structure system (placement validation, effect queries)
- NPC system + Yuka AI
- All config/data JSON files

## What Must Be Rebuilt

These depend on BabylonJS or web-specific APIs:
- 3D scene rendering (BabylonJS -> R3F components) -- **done** (components/scene/)
- Camera system (BabylonJS ArcRotateCamera -> R3F/drei camera) -- **done**
- Lighting (BabylonJS lights -> R3F/drei lights) -- **done**
- Ground/terrain (BabylonJS DynamicTexture -> R3F mesh) -- **done**
- Skybox (BabylonJS HDRCubeTexture -> drei Sky) -- **done**
- Tree meshes (BabylonJS SPS -> Three.js procedural geometry) -- **done** (game/utils/treeGeometry.ts)
- Player mesh (BabylonJS primitives -> R3F mesh) -- in progress
- Structure meshes (BlockMeshFactory -> R3F components) -- in progress
- All UI components (DOM/shadcn -> React Native/NativeWind) -- **done** (components/game/)
- Input system (DOM events -> React Native gesture handlers) -- **done** (game/hooks/useInput.ts)
- Virtual joystick (nipplejs/custom DOM -> React Native component) -- **done**
- Persistence layer (localStorage -> expo-sqlite) -- in progress (game/db/)
- Service worker / PWA (replaced by native app via Expo) -- N/A
- CSS weather overlays (DOM CSS -> React Native animated views or R3F effects) -- pending

## Known Issues

None critical -- migration is progressing steadily.
