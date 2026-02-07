# CLAUDE.md -- Grovekeeper

See `docs/` for complete game design, architecture, and brand documentation.

## Project Identity

**Grovekeeper** is a cozy 2.5D isometric tree-planting simulation / idle tending game. Mobile-first PWA (portrait), desktop secondary. Target session: 3-15 minutes (commute-friendly).

**Tagline:** *"Every forest begins with a single seed."*

## Critical Context

### Mobile-First is Non-Negotiable

Every decision -- from UI layout to performance budgets to touch targets -- must prioritize mobile portrait mode. Desktop is a graceful enhancement, never the primary target.

- All touch targets: minimum 44x44px
- Unified InputManager: drag-anywhere on canvas (mobile), WASD (desktop), tap/click-to-move with A* pathfinding
- Test at 375px width (iPhone SE) as the minimum viewport
- Passive event listeners for all pointer handlers
- `touch-action: none` on the game canvas
- Haptic feedback via `@capacitor/haptics` on supported devices

### Current Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | React 19 | UI layer, component model |
| 3D Engine | BabylonJS 8.x | Scene rendering, procedural meshes |
| ECS | Miniplex 2.x | Entity-component-system |
| ECS React | miniplex-react | React hooks for ECS queries |
| State | Zustand 5.x | Persistent game state via localStorage |
| Input | InputManager (custom) | Unified pointer/keyboard/tap-to-move with A* pathfinding |
| Styling | Tailwind CSS 4.x + shadcn/ui | UI component library |
| Bundler | Vite 6.x | Fast dev server, HMR |
| Language | TypeScript 5.7+ | Strict mode |
| Lint/Fmt | Biome 2.3 | Single tool for lint + format |
| Package Mgr | pnpm | Fast, strict |
| Testing | Vitest 4.x + @testing-library/react | TDD approach |
| Mobile Native | Capacitor 8.x | PWA + native bridge |

## Common Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build (development mode)
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Test with coverage
pnpm test:coverage

# Lint
pnpm lint

# Format
pnpm format

# Full check (lint + format)
pnpm check

# TypeScript type check
pnpm tsc
```

## Project Structure

```
grovekeeper/
├── CLAUDE.md                         # This file
├── AGENTS.md                         # Multi-agent orchestration guide
├── memory-bank/                      # Persistent project context
├── docs/                             # Game design, architecture, brand docs
│   ├── README.md                     # Documentation index
│   ├── GAME_DESIGN_DOCUMENT.md       # Full game design document
│   ├── TECHNICAL_ARCHITECTURE.md     # Technical architecture overview
│   ├── SYSTEMS.md                    # Game systems reference
│   ├── API_REFERENCE.md              # API and store reference
│   ├── ROADMAP.md                    # Future roadmap
│   ├── architecture/                 # Architecture deep dives
│   │   ├── overview.md
│   │   ├── ecs-patterns.md
│   │   └── state-management.md
│   ├── brand/
│   │   └── identity.md               # Visual identity, design tokens
│   ├── game-design/
│   │   ├── core-loop.md
│   │   └── grid-system.md
│   ├── guides/                       # Developer guides
│   ├── plans/                        # Historical build plans
│   └── ui-ux/                        # UI/UX documentation
├── src/
│   ├── main.tsx                      # Entry point
│   ├── App.tsx                       # Root component -> Game
│   ├── game/
│   │   ├── Game.tsx                  # Screen router (menu | playing)
│   │   ├── scenes/
│   │   │   └── GameScene.tsx         # BabylonJS canvas + game loop orchestrator
│   │   ├── scene/                    # Scene manager modules
│   │   │   ├── SceneManager.ts       # Coordinates all scene managers
│   │   │   ├── CameraManager.ts      # Orthographic diorama camera
│   │   │   ├── GroundBuilder.ts      # DynamicTexture biome blending
│   │   │   ├── LightingManager.ts    # Hemisphere + directional lights
│   │   │   ├── SkyManager.ts         # HDRI skybox
│   │   │   ├── PlayerMeshManager.ts  # Player mesh lifecycle
│   │   │   ├── TreeMeshManager.ts    # Tree mesh lifecycle + template cache
│   │   │   └── BorderTreeManager.ts  # Decorative border trees
│   │   ├── ecs/
│   │   │   ├── world.ts              # Miniplex World + queries
│   │   │   ├── world.test.ts
│   │   │   ├── react.ts              # miniplex-react hooks API
│   │   │   ├── archetypes.ts         # Entity factory functions
│   │   │   └── archetypes.test.ts
│   │   ├── world/                    # World data layer
│   │   │   ├── WorldManager.ts       # Zone loading, world state
│   │   │   ├── WorldGenerator.ts     # Procedural world generation
│   │   │   ├── ZoneLoader.ts         # JSON zone hydration
│   │   │   ├── types.ts              # World/zone type definitions
│   │   │   ├── archetypes.ts         # Tile entity factories
│   │   │   └── data/
│   │   │       └── starting-world.json  # Level 1-5 zone definitions
│   │   ├── structures/               # Structure system
│   │   │   ├── StructureManager.ts   # Structure placement + effects
│   │   │   ├── BlockMeshFactory.ts   # Daggerfall-style block meshes
│   │   │   ├── types.ts              # Structure type definitions
│   │   │   └── data/
│   │   │       ├── blocks.json       # Block catalog
│   │   │       └── structures.json   # Structure recipes
│   │   ├── systems/
│   │   │   ├── growth.ts             # Tree growth (5-stage, spec formula)
│   │   │   ├── movement.ts           # Player movement
│   │   │   ├── time.ts               # Day/night + season cycle
│   │   │   ├── quests.ts             # Quest/goal generation
│   │   │   ├── platform.ts           # Capacitor haptics bridge
│   │   │   ├── weather.ts            # Weather events (rain/drought/wind)
│   │   │   ├── achievements.ts       # 15 achievements
│   │   │   ├── prestige.ts           # Level 25+ prestige + cosmetics
│   │   │   ├── gridExpansion.ts      # Grid expansion (16/20/24/32)
│   │   │   ├── gridGeneration.ts     # Tile generation (soil/water/rock/path)
│   │   │   ├── levelUnlocks.ts       # Level-based unlock progression
│   │   │   ├── offlineGrowth.ts      # Offline growth calculation
│   │   │   ├── saveLoad.ts           # Save/load serialization
│   │   │   ├── harvest.ts            # Harvest yield + resource drops (late-binding multipliers)
│   │   │   ├── stamina.ts            # Stamina drain + regen
│   │   │   ├── InputManager.ts       # Unified input: pointer, keyboard, tap-to-move A*
│   │   │   ├── pathfinding.ts        # A* on tile grid + walkability grid builder
│   │   │   ├── pathFollowing.ts      # Waypoint interpolation for tap-to-move
│   │   │   ├── discovery.ts          # Species discovery system
│   │   │   ├── recipes.ts            # Crafting recipe system
│   │   │   ├── trading.ts            # Resource trading system
│   │   │   ├── seasonalMarket.ts     # Seasonal market prices
│   │   │   ├── toolUpgrades.ts       # Tool upgrade progression
│   │   │   ├── wildTreeRegrowth.ts   # Wild tree respawn system
│   │   │   ├── zoneBonuses.ts        # Per-zone bonus effects
│   │   │   └── *.test.ts             # Adjacent test files
│   │   ├── stores/
│   │   │   ├── gameStore.ts          # Zustand persistent state
│   │   │   └── gameStore.test.ts
│   │   ├── constants/
│   │   │   ├── config.ts             # Grid size, colors, growth stages
│   │   │   ├── trees.ts              # Tree species definitions (15 species)
│   │   │   ├── tools.ts              # Tool definitions + stamina costs
│   │   │   ├── resources.ts          # Resource type definitions
│   │   │   └── *.test.ts             # Adjacent test files
│   │   ├── utils/
│   │   │   ├── spsTreeGenerator.ts   # Ported BabylonJS SPS tree generator
│   │   │   ├── treeMeshBuilder.ts    # Species-specific PBR meshes
│   │   │   ├── gridMath.ts           # Grid coordinate math utilities
│   │   │   ├── seedRNG.ts            # Seeded RNG for deterministic meshes
│   │   │   └── *.test.ts             # Adjacent test files
│   │   ├── ui/
│   │   │   ├── MainMenu.tsx          # Start screen
│   │   │   ├── HUD.tsx               # In-game overlay container
│   │   │   ├── GameUI.tsx            # HUD + joystick + dialogs
│   │   │   ├── Joystick.tsx          # nipplejs wrapper
│   │   │   ├── Logo.tsx              # SVG logo
│   │   │   ├── FarmerMascot.tsx      # SVG farmer "Fern"
│   │   │   ├── ToolWheel.tsx         # Tool selection dialog
│   │   │   ├── ToolBelt.tsx          # Tool belt HUD (bottom-right)
│   │   │   ├── SeedSelect.tsx        # Species picker dialog
│   │   │   ├── PauseMenu.tsx         # Pause overlay + settings
│   │   │   ├── TimeDisplay.tsx       # Day/night/season indicator
│   │   │   ├── QuestPanel.tsx        # Active quest tracker
│   │   │   ├── RulesModal.tsx        # First-time tutorial
│   │   │   ├── ResourceBar.tsx       # Timber/Sap/Fruit/Acorn display
│   │   │   ├── StaminaGauge.tsx      # Stamina bar
│   │   │   ├── XPBar.tsx             # XP + level display
│   │   │   ├── ActionButton.tsx      # Context-sensitive action button
│   │   │   ├── WeatherOverlay.tsx    # CSS weather effects + petals
│   │   │   ├── AchievementPopup.tsx  # Gold border + sparkle modal
│   │   │   ├── MiniMap.tsx           # SVG-based minimap (desktop overlay, mobile fullscreen)
│   │   │   ├── Toast.tsx             # Toast notification system
│   │   │   ├── FloatingParticles.tsx # +XP / +Timber floating numbers
│   │   │   └── ErrorBoundary.tsx     # React error boundary
│   │   └── types.ts                  # Core type definitions
│   ├── components/
│   │   └── ui/                       # shadcn/ui components
│   ├── hooks/
│   │   ├── use-mobile.ts             # Mobile detection hook
│   │   └── use-media-query.tsx       # Responsive breakpoint hook
│   └── lib/
│       └── utils.ts                  # cn() utility for Tailwind
├── public/
│   ├── textures/                     # PBR texture assets
│   ├── manifest.json                 # PWA manifest
│   └── sw.js                         # Service worker
├── capacitor.config.ts               # Capacitor native config
├── biome.json                        # Linter/formatter config
├── vitest.config.ts                  # Test runner config
├── vite.config.ts                    # Bundler config
└── tsconfig.json                     # TypeScript config
```

## Architecture Patterns

### ECS (Entity-Component-System)

All game entities live in the Miniplex `world`. Query them, don't search:

```typescript
// Good: use pre-defined queries
const trees = treesQuery;  // world.with('tree', 'position', 'renderable')

// Bad: searching arrays
const trees = allEntities.filter(e => e.tree);
```

Systems are pure functions: `(world, deltaTime, ...context) => void`. They run every frame in the game loop inside `GameScene.tsx`.

### State Split: ECS vs Zustand

- **ECS (Miniplex):** Runtime game state -- entity positions, growth progress, tile states. Lives in memory, serialized for saves.
- **Zustand (gameStore):** Persistent player state -- level, XP, resources, unlocks, settings, quest progress, stamina, prestige. Auto-persisted to localStorage via `persist` middleware.
- **Rule:** If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in Zustand.

### BabylonJS Scene Management

The 3D scene is imperative (not declarative React). `GameScene.tsx` (~400 lines) orchestrates scene setup and game loop, delegating subsystem management to specialized scene managers:

- **SceneManager**: Coordinates all subsystem managers
- **CameraManager**: Orthographic diorama camera (NOT isometric)
- **GroundBuilder**: DynamicTexture biome blending, grid overlay
- **LightingManager**: Hemisphere + directional lights, day/night sync
- **SkyManager**: HDRI skybox with seasonal rotation
- **PlayerMeshManager**: Player mesh lifecycle (create, update, dispose)
- **TreeMeshManager**: Tree mesh lifecycle (template cache, clone, lerp growth, freeze)
- **BorderTreeManager**: Decorative border trees outside playable grid
- **StructureManager**: Structure placement and rendering via BlockMeshFactory

All mesh references are stored in React refs, not state. BabylonJS operates outside React's render cycle.

### World System

The world is data-driven, composed of **zones** loaded from JSON:

- **WorldManager**: Zone loading/unloading, world state, zone transitions
- **WorldGenerator**: Procedural world generation (level-based biomes, prestige resets)
- **ZoneLoader**: Hydrates JSON zone definitions into ECS entities (tiles, trees, structures)
- **Data files**: `src/game/world/data/*.json` define zone templates (starting-world.json for levels 1-5)

Each zone is a 16x16 tile grid with trees, water tiles, rock tiles, and structures pre-placed. Players move between zones seamlessly. On prestige, WorldGenerator creates a new procedurally-generated world.

### Component Conventions

- Named exports only (never `export default`)
- Props typed with `interface Props`
- shadcn/ui for dialogs, buttons, cards, progress bars
- Inline styles for game-specific colors (from `COLORS` constants)
- Tailwind for layout and responsive utilities

## Performance Budgets

| Metric | Target | Actual |
|--------|--------|--------|
| FPS (mobile) | >= 55 | Achieved |
| FPS (desktop) | >= 60 | Achieved |
| Initial bundle (gz) | < 500 KB | ~107 KB |
| Total game load (gz) | < 600 KB | ~500 KB |
| Time to interactive | < 3s | Achieved |
| Memory (mobile) | < 100 MB | Achieved |
| Draw calls | < 50 | Achieved |

### Key Optimizations

- Tree-shake BabylonJS: import specific modules, never barrel exports
- SPS template mesh caching: `Mesh.clone` for same-species same-stage trees
- Freeze world matrices on stage 4 (Old Growth) static meshes
- Shadow map: 1024px desktop, 512px mobile
- Passive event listeners for touch
- Code splitting via dynamic import: MainMenu vs GameScene (~107 KB initial load)
- CSS-based weather overlays (avoids BabylonJS ParticleSystem bundle bloat)
- Lerp-based growth animations: `Math.min(1, dt * speed)` for frame-rate independence

## Testing

755 tests across 37 test files. TypeScript clean (no type errors).

Write tests first for:
- Pure utility functions (grid math, RNG, growth calculations)
- ECS systems (mock world, verify state changes)
- Store actions (verify state transitions)
- Component rendering (mock data, verify display)

Test files live adjacent to source: `*.test.ts(x)`.

```bash
# Run specific test
pnpm test -- growth

# Watch mode (default)
pnpm test

# Coverage report
pnpm test:coverage
```

## Complete Systems

All game systems from the original design are implemented. Phase D (Polish and Ship) is complete.

### Game Systems
- **Growth:** 5-stage progression (Seed/Sprout/Sapling/Mature/Old Growth) with spec formula accounting for season, water, difficulty, species traits
- **Weather:** Rain (growth boost), drought (growth penalty), windstorm (damage risk), with CSS overlays
- **Seasons:** 4-season cycle with visual changes to sky, lighting, and canopy colors
- **Achievements:** 15 achievements with gold border + sparkle popup
- **Prestige:** Level 25+ prestige reset with 5 cosmetic border themes (Stone Wall through Ancient Runes)
- **Grid Expansion:** Progressive grid sizes (12/16/20/24/32) unlocked by level
- **World:** Multi-zone world with data-driven zones, procedural generation, zone transitions
- **Structures:** 6 structure types with grid-snap placement, effect radii (growth boost, harvest boost, stamina regen)
- **World Generator:** Level-based procedural world generation, prestige world resets
- **Offline Growth:** Background growth calculation on app resume
- **Save/Load:** Serialization with auto-save on `document.visibilitychange`
- **Stamina:** Drain on tool actions, time-based regeneration
- **Harvest:** Species-specific yields (Timber/Sap/Fruit/Acorns) with late-binding multipliers (computed at collect time)
- **Quests:** Goal pool generation and tracking
- **Input:** Unified InputManager — drag-to-move (mobile), WASD (desktop), tap/click-to-move with A* pathfinding
- **Pathfinding:** Grid A* with walkability grid, iterative waypoint following
- **Discovery:** Species discovery system
- **Recipes:** Crafting recipe system
- **Trading:** Resource trading with seasonal market prices
- **Tool Upgrades:** Progressive tool enhancement
- **Wild Tree Regrowth:** Wild tree respawn system
- **Zone Bonuses:** Per-zone bonus effects
- **Time:** Microsecond-precision day/night cycle with dynamic sky colors

### Visual Features
- **SPS Trees:** Ported BabylonJS SPS Tree Generator with seeded RNG
- **PBR Materials:** 5 bark + 2 leaf texture sets
- **15 Species:** 12 base + 3 prestige (Ghost Birch glow, Crystal Oak prismatic tints, Cherry Blossom petals)
- **Growth Animations:** Lerp-based smooth scale interpolation between stages
- **Weather Overlays:** CSS rain, drought haze, windstorm, cherry petal effects
- **Seasonal Rebuilds:** Tree meshes rebuild on season change for canopy color shifts
- **Design Tokens:** Full CSS custom property system (spec Section 5)
- **Typography:** Fredoka headings, Nunito body

### HUD Components
- Resource bar (Timber/Sap/Fruit/Acorns), stamina gauge, XP bar, tool belt
- Mini-map (desktop only), achievement popup, toast notifications
- Weather overlay, floating particles (+XP, +Timber on harvest)
- Action button (context-sensitive), pause menu with grid expansion and prestige
- Time display (day/night/season), quest panel

### Infrastructure
- PWA manifest + service worker for offline play
- Code splitting: ~107 KB initial, ~500 KB total game load
- Capacitor bridge for native mobile haptics
- CI/CD: GitHub Actions (CI + Deploy to GitHub Pages + Release)
- Live at: https://arcade-cabinet.github.io/grovekeeper/

## Key Files to Read First

When starting any work session, read these files in order:

1. `docs/README.md` -- Documentation index
2. `memory-bank/activeContext.md` -- Current work focus
3. `memory-bank/progress.md` -- What's done, what's next
4. `src/game/Game.tsx` -- Screen routing
5. `src/game/scenes/GameScene.tsx` -- The game loop + 3D scene orchestrator
6. `src/game/scene/SceneManager.ts` -- Scene subsystem coordination
7. `src/game/world/WorldManager.ts` -- World data layer, zone loading
8. `src/game/world/data/starting-world.json` -- Zone definitions for levels 1-5
9. `src/game/structures/StructureManager.ts` -- Structure placement + effects
10. `src/game/stores/gameStore.ts` -- All persistent state
11. `src/game/utils/treeMeshBuilder.ts` -- Species-specific mesh generation
12. `src/game/systems/weather.ts` -- Weather event system

## Mobile-First Development Checklist

Before merging any UI change, verify:

- [ ] Renders correctly at 375px width (iPhone SE portrait)
- [ ] Touch targets >= 44px
- [ ] No overlap with bottom action bar
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zooming (minimum 14px body)
- [ ] Dialogs don't extend beyond viewport
- [ ] Canvas has `touch-action: none`
- [ ] Animations respect `prefers-reduced-motion`
- [ ] FPS >= 55 on mid-range mobile
