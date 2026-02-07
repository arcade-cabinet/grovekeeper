# Tech Context -- Grovekeeper

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | React | 19.x | UI layer |
| 3D Engine | BabylonJS | 8.x | `@babylonjs/core`, `/materials`, `/loaders` |
| ECS | Miniplex | 2.x | Entity-component-system |
| ECS + React | miniplex-react | latest | createReactAPI for reactive UI |
| State | Zustand | 5.x | `persist` middleware for localStorage |
| Input | nipplejs | 0.10.x | Virtual joystick for mobile |
| Styling | Tailwind CSS | 4.x | With `@tailwindcss/vite` plugin |
| UI Components | shadcn/ui | latest | Radix primitives, Tailwind styling |
| Animation | Framer Motion | 12.x | Used sparingly for UI transitions |
| Icons | Remix Icon | 4.6.x | `@remixicon/react` |
| Icons (alt) | Lucide React | 0.503.x | Secondary icon set |
| Mobile | Capacitor | 8.x | `@capacitor/core`, `/device`, `/haptics` |
| Bundler | Vite | 6.x | `@vitejs/plugin-react`, manual chunks config |
| Language | TypeScript | 5.7+ | Strict mode, clean (zero errors) |
| Lint/Fmt | Biome | 2.3 | Single tool for lint + format |
| Testing | Vitest | 4.x | `happy-dom` environment, 751 tests, 37 files |
| Testing Lib | @testing-library/react | 16.x | Component testing |
| Package Mgr | pnpm | 9.x | Lockfile: `pnpm-lock.yaml` |

### Key Non-npm Dependencies

- **SPS Tree Generator** -- Ported from the BabylonJS Extensions repo into `src/game/utils/spsTreeGenerator.ts`. Written in TypeScript with seeded RNG. Not available as an npm package; must be maintained in-tree.

## Development Setup

```bash
# Prerequisites
node >= 20
pnpm >= 9

# Install
pnpm install

# Dev server (http://localhost:5173)
pnpm dev

# Build
pnpm build

# Test
pnpm test          # watch mode
pnpm test:run      # single run (CI)
pnpm test:coverage # with v8 coverage
```

## Build Configuration

### Vite (`vite.config.ts`)
- React plugin
- Tailwind CSS plugin
- Path alias: `@/` maps to `./src/`
- Manual chunks configuration for BabylonJS (splits engine into separate chunk)
- Lazy import of GameScene for code splitting
- Production builds tree-shake effectively

### Code Splitting Results
```
Initial load: ~107 KB (gzipped)
  - React, Zustand, UI framework, main menu

Game load: ~500 KB total (gzipped)
  - BabylonJS core (manual chunk)
  - GameScene (lazy imported on game start)
  - SPS Tree Generator
  - HDRI skybox loaded at runtime
```

### TypeScript (`tsconfig.json`)
- `strict: true`
- `jsx: "react-jsx"`
- `target: "ES2020"`, `module: "ESNext"`
- `moduleResolution: "bundler"`
- Path alias: `"@/*"` maps to `["./src/*"]`

### Biome (`biome.json`)
- Version 2.3
- Organize imports via `assist.actions.source.organizeImports` (Biome 2.3 syntax)
- Indent: 2 spaces
- Linter: recommended rules
- Overrides configured for:
  - Tests (`**/*.test.{ts,tsx}`): allow console.log
  - Type declarations (`**/*.d.ts`): less strict rules
  - shadcn UI components (`src/components/ui/**`): allow default exports
  - Game UI components (`src/game/ui/**`): allow default exports
- Files ignored: `dist/**`, `node_modules/**`, `coverage/**`

### Vitest (`vitest.config.ts`)
- Environment: `happy-dom`
- Setup file: `src/test/setup.ts`
- Path alias: `@/` maps to `./src/`

## Test Infrastructure

- **751 tests** across **37 test files**, all passing
- Test files live adjacent to source: `*.test.ts(x)`
- Key test locations: `src/game/stores/`, `src/game/systems/`, `src/game/utils/`, `src/game/world/`
- Systems tested: growth, movement, weather, achievements, prestige, gridExpansion, offlineGrowth, levelUnlocks
- Store tested: gameStore (comprehensive state transitions)
- Utils tested: treeMeshBuilder, gridMath, seedRNG, tools, trees, world
- World tested: WorldManager (zone loading, structure rendering), WorldGenerator (procedural world)

### Testing Gotchas
- `vi.mock` hoisting: factory functions cannot reference outer `const`; use inline classes
- BabylonJS 8.x: `isDisposed()` does not exist on PBRMaterial -- check differently
- `queueMicrotask()` needed to defer side effects from Zustand `set()` calls in tests

## Known Constraints

### BabylonJS Bundle Size
BabylonJS is large. Tree-shake aggressively -- import specific modules:
```typescript
// Good
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
// Bad
import { Vector3 } from "@babylonjs/core";
```

Manual chunks in Vite config separate BabylonJS into its own chunk so it does not block initial load.

### Mobile Performance
- BabylonJS WebGL on mobile is GPU-constrained
- Template mesh caching with Mesh.clone reduces mesh generation cost
- Matrix freezing on stage 4 static trees (LOD optimization)
- CSS weather overlays instead of BabylonJS ParticleSystem (avoids bundle bloat)
- Max 50 draw calls for smooth frame rate
- Shadow maps: 512px mobile, 1024px desktop
- HDRI skybox provides IBL lighting without runtime cost

### localStorage Limits
- ~5MB limit in most browsers
- Save data is compact -- only essential state serialized
- No binary data (meshes are procedural, not stored)

### Capacitor
- `capacitor.config.ts` configured for `com.grovekeeper.app`
- `webDir: 'dist'` -- builds to dist/
- Android scheme: https
- Haptics and Device plugins configured
- **Not yet built** -- no `ios/` or `android/` directories exist

## Scene Architecture

GameScene.tsx has been decomposed from ~1050 lines to ~400 lines. Scene management is modular:

### Scene Modules (`src/game/scene/`)
- **SceneManager.ts** -- Engine + Scene creation/disposal
- **CameraManager.ts** -- Orthographic ArcRotateCamera (NOT isometric), viewport-adaptive scaling (14-40 tiles visible based on screen size)
- **LightingManager.ts** -- Hemisphere + directional light, day/night sync
- **GroundBuilder.ts** -- DynamicTexture biome blending (distance-field weights, inverse smoothstep)
- **SkyManager.ts** -- HDRI skybox (HDRCubeTexture) + IBL environment
- **PlayerMeshManager.ts** -- Player mesh lifecycle
- **TreeMeshManager.ts** -- Template cache, clone, growth animation lerp, matrix freezing
- **BorderTreeManager.ts** -- Decorative border tree placement

### World System (`src/game/world/`)
- **types.ts** -- ZoneDefinition, WorldDefinition interfaces
- **WorldManager.ts** -- Zone loading/unloading, structure mesh rendering, tile management
- **WorldGenerator.ts** -- Procedural world generation from seed + player level
- **archetypes.ts** -- Zone archetype definitions (starting, water-zone, meadow-grove, rocky-ridge, dense-forest)
- **data/starting-world.json** -- 3 zones: Starting Grove (12x12), Forest Trail (4x8), Sunlit Clearing (8x8)

### Structure System (`src/game/structures/`)
- **types.ts** -- BlockDefinition, StructureTemplate interfaces
- **StructureManager.ts** -- Placement validation, effect queries
- **BlockMeshFactory.ts** -- Procedural mesh generation from block definitions
- **data/blocks.json** -- Block catalog
- **data/structures.json** -- 6 structures: Wooden Fence, Tool Shed, Greenhouse, Market Stall, Well, Bench

## Dependencies Worth Noting

### Active and Essential
- `@babylonjs/*` -- 3D rendering engine (core dependency)
- `miniplex` + `miniplex-react` -- ECS for game entities + React integration
- `zustand` -- State management with persistence
- `nipplejs` -- Virtual joystick
- `react`, `react-dom` -- UI framework

### Active but Could Be Lighter
- `@radix-ui/*` (via shadcn) -- Full component library, some components unused
- `framer-motion` -- Animation library, lightly used
- `recharts` -- Chart library, not yet used in game
- `react-hook-form` + `zod` -- Form validation, overkill for current needs

## Texture and Asset Loading

Located in `public/`:
- `textures/` -- 5 bark texture sets (diffuse, normal, roughness), 2 leaf textures
- HDRI skybox loaded via HDRCubeTexture at runtime
- Used by `treeMeshBuilder.ts` for species-specific materials (StandardMaterial, NOT PBR)

## Tool Usage

### pnpm
- All commands via `pnpm <script>`
- Lock file: `pnpm-lock.yaml` (committed)
- Node modules: strict (no phantom deps)

### Biome
- `pnpm lint` -- lint check
- `pnpm format` -- auto-format
- `pnpm check` -- lint + format together

### Vitest
- `pnpm test` -- watch mode (default)
- `pnpm test:run` -- CI single-pass
- `pnpm test:coverage` -- with v8 coverage

### TypeScript
- `pnpm tsc` -- full type check (currently clean, zero errors)
- Errors are NOT blocking for `pnpm dev` (Vite ignores TS errors during dev)
