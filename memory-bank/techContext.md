# Tech Context -- Grovekeeper

## Tech Stack (Expo/R3F)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Platform | Expo | SDK 55 | Universal: iOS + Android + Web |
| Runtime | React | 19.2 | UI layer |
| Native | React Native | 0.83 | Mobile runtime |
| 3D Engine | React Three Fiber | latest | Declarative Three.js for React Native |
| 3D Helpers | @react-three/drei | latest | Useful R3F abstractions (OrbitControls, Sky, etc.) |
| ECS | Miniplex | 2.x | Entity-component-system (unchanged) |
| ECS + React | miniplex-react | latest | createReactAPI for reactive UI |
| State | Zustand | 5.x | Persistent state management |
| Database | expo-sqlite | latest | Native SQLite for persistence |
| ORM | drizzle-orm | latest | Type-safe SQL queries |
| NPC AI | Yuka | 0.7.x | Lightweight game AI |
| Styling | NativeWind | 4.x | Tailwind CSS for React Native |
| UI Components | React Native Reusables | latest | Replaces shadcn/ui + Radix |
| Language | TypeScript | 5.7+ | Strict mode |
| Lint/Fmt | Biome | 2.3+ | Single tool for lint + format |
| Testing | Jest | latest | Unit + integration tests |
| E2E Testing | Maestro | latest | Mobile E2E tests (replaces Playwright) |
| Package Mgr | pnpm | 9.x | Fast, strict |

### Removed from Stack
- **BabylonJS** -- Replaced by React Three Fiber
- **Vite** -- Replaced by Expo/Metro bundler
- **Vitest** -- Replaced by Jest
- **happy-dom** -- No longer needed (Jest uses its own environment)
- **Capacitor** -- Replaced by Expo (native bridge built-in)
- **nipplejs** -- Replaced by custom virtual joystick component
- **shadcn/ui + Radix** -- Replaced by React Native Reusables
- **sql.js** -- Replaced by expo-sqlite
- **Framer Motion** -- Replaced by React Native Animated / Reanimated

## Development Setup

```bash
# Prerequisites
node >= 20
pnpm >= 9
# For iOS: Xcode + CocoaPods
# For Android: Android Studio + SDK

# Install
pnpm install

# Dev server (Expo)
pnpm start           # Expo dev server
pnpm ios             # Run on iOS simulator
pnpm android         # Run on Android emulator
pnpm web             # Run in browser

# Build
pnpm build:web       # Web production build
eas build            # Native builds via EAS

# Test
pnpm test            # Jest watch mode
pnpm test:run        # Jest single run (CI)
pnpm test:coverage   # With coverage

# E2E
maestro test         # Mobile E2E tests

# Lint/Format
pnpm lint
pnpm format
pnpm check           # lint + format together
```

## Build Configuration

### Expo (app.json / app.config.ts)
- SDK version: 55
- Scheme: `grovekeeper`
- Web output: `single` (SPA)
- Plugins configured for expo-sqlite, etc.

### Metro Bundler
- Replaces Vite for JS bundling
- Configured via `metro.config.js`
- NativeWind requires Metro CSS interop setup

### TypeScript (`tsconfig.json`)
- `strict: true`
- Expo-compatible module resolution
- Path alias: `@/` maps to project root (e.g., `@/game/stores/gameStore`)

### Biome (`biome.json`)
- Version 2.3+
- Organize imports via `assist.actions.source.organizeImports`
- Indent: 2 spaces
- Overrides for tests, type declarations, UI components

### NativeWind Setup
- `tailwind.config.ts` with custom design tokens
- `global.css` with Tailwind directives
- Metro CSS interop for React Native
- Custom theme extending Tailwind defaults (earth tones, Fredoka/Nunito fonts)

## Test Infrastructure

- **Jest** for unit and integration tests
- Test files live adjacent to source: `*.test.ts(x)`
- **Maestro** for mobile E2E tests (replaces Playwright)
- Key test areas: stores, systems, utils, world, ECS

### Testing Patterns
- Mock Three.js/R3F objects in unit tests
- ECS systems are pure functions -- easy to test without rendering
- Zustand store actions tested via state transitions
- `queueMicrotask()` needed to defer side effects from Zustand `set()` calls in tests

## Configuration Files

Game data stored as JSON in `config/` directory:
```
config/
  theme.json              # Colors, typography, spacing
  game/
    species.json          # 15 species (12 base + 3 prestige)
    tools.json            # 8 tools with stamina costs
    resources.json        # Resource type definitions
    growth.json           # Growth stage parameters
    weather.json          # Event probabilities, multipliers
    achievements.json     # 15 achievements
    prestige.json         # Tiers, bonuses, cosmetic themes
    grid.json             # Expansion tiers, costs, sizes
    npcs.json             # NPC template definitions
    dialogues.json        # Dialogue trees
    quests.json           # Quest chain definitions
    difficulty.json       # Difficulty multipliers
  world/
    starting-world.json   # Zone definitions
    blocks.json           # Block catalog
    structures.json       # Structure recipes
    encounters.json       # Random encounters
    festivals.json        # Seasonal festivals
```

## Database (expo-sqlite + drizzle-orm)

Replaces localStorage-based persistence:
- Native SQLite on iOS/Android
- drizzle-orm for type-safe schema and queries
- Zustand persist middleware adapted for SQLite storage
- Supports larger save data than localStorage's ~5MB limit
- Offline-first by nature

## Known Constraints

### React Three Fiber on Mobile
- Three.js WebGL on mobile is GPU-constrained
- Instanced meshes for same-species same-stage trees (replaces BabylonJS Mesh.clone)
- Minimize draw calls (target < 50)
- Use `drei` helpers for performance (Instances, Merged, etc.)

### React Native Specifics
- No DOM -- all UI must be React Native components
- NativeWind provides Tailwind-like API but compiles to RN StyleSheet
- Gesture handling via React Native Gesture Handler
- Animations via React Native Reanimated for 60fps

### Expo Constraints
- EAS Build for production native binaries
- Some native modules require custom dev client
- Web support via `expo-web` (renders to DOM)

## Project Structure

```
grovekeeper/
  app/                    # Expo Router screens
  components/             # React Native + R3F components
    ui/                   # Base UI (button, text, icon)
    game/                 # Game UI (HUD, menus, popups)
    scene/                # R3F scene (Camera, Lighting, Sky, Ground)
    entities/             # R3F entities (Player, Trees, NPCs)
  config/                 # JSON game data files
    theme.json            # Colors, typography, spacing
    game/                 # Game balance (species, tools, growth, etc.)
    world/                # World data (zones, blocks, structures)
  game/                   # Game logic (engine-agnostic)
    ecs/                  # Miniplex world, queries, archetypes
    systems/              # Pure game systems (growth, weather, etc.)
    stores/               # Zustand stores
    hooks/                # Custom hooks (useInput, useMovement)
    ai/                   # Yuka NPC AI
    npcs/                 # NPC management
    quests/               # Quest system
    events/               # Event system
    world/                # World/zone data layer
    structures/           # Structure system
    actions/              # Game action dispatcher
    config/               # Runtime config loaders
    db/                   # expo-sqlite + drizzle-orm
    ui/                   # Game-specific UI utilities
    utils/                # Pure utilities (treeGeometry, seedRNG)
  lib/                    # Shared utilities (cn(), etc.)
  assets/                 # Textures, fonts, etc.
```

## Dependencies Worth Noting

### Active and Essential
- `expo` -- Platform framework
- `react-native` -- Native runtime
- `@react-three/fiber` + `@react-three/drei` -- 3D rendering
- `three` -- 3D engine (peer dep of R3F)
- `miniplex` + `miniplex-react` -- ECS
- `zustand` -- State management
- `expo-sqlite` + `drizzle-orm` -- Persistence
- `nativewind` -- Styling
- `yuka` -- NPC AI

### Development
- `jest` -- Testing
- `maestro` -- Mobile E2E
- `@biomejs/biome` -- Lint + format
- `typescript` -- Type checking
