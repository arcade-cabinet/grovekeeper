# CLAUDE.md — Grovekeeper

> **Canonical Spec:** `GROVEKEEPER_BUILD_PROMPT.md` is the single source of truth for game design, systems, and visual identity. Read it before making any game-related changes.

## Project Identity

**Grovekeeper** is a cozy 2.5D isometric tree-planting simulation / idle tending game. Mobile-first PWA (portrait), desktop secondary. Target session: 3-15 minutes (commute-friendly).

**Tagline:** *"Every forest begins with a single seed."*

## Critical Context

### Mobile-First is Non-Negotiable

Every decision — from UI layout to performance budgets to touch targets — must prioritize mobile portrait mode. Desktop is a graceful enhancement, never the primary target.

- All touch targets: minimum 44x44px
- Virtual joystick (nipplejs) is the primary movement input
- HUD elements must not overlap the joystick zone (bottom-left 200x200px)
- Test at 375px width (iPhone SE) as the minimum viewport
- Passive event listeners for all touch handlers
- `touch-action: none` on the game canvas
- Haptic feedback via `@capacitor/haptics` on supported devices

### Current Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | React 19 | UI layer, component model |
| 3D Engine | BabylonJS 8.x | Scene rendering, procedural meshes |
| ECS | Miniplex 2.x | Entity-component-system |
| State | Zustand 5.x | Persistent game state via localStorage |
| Input | nipplejs 0.10.x | Mobile virtual joystick |
| Styling | Tailwind CSS 4.x + shadcn/ui | UI component library |
| Bundler | Vite 6.x | Fast dev server, HMR |
| Language | TypeScript 5.7+ | Strict mode |
| Lint/Fmt | Biome 2.3 | Single tool for lint + format |
| Package Mgr | pnpm | Fast, strict |
| Testing | Vitest 4.x + @testing-library/react | TDD approach |
| Mobile Native | Capacitor 8.x | PWA + native bridge |

### Deviation from Spec

The current codebase has intentionally evolved from the original spec in these ways:
- **Tailwind + shadcn/ui** instead of Vanilla CSS + CSS Modules (better DX, consistent components)
- **BabylonJS 8.x** instead of 7.x (newer release)
- **Capacitor** added for native mobile deployment (not in original spec)
- **Time system** uses microsecond precision day/night + seasons (richer than spec's simple 60s/4day cycle)
- **Quest system** uses goal pools instead of spec's template-based daily challenges
- **Color scheme** uses existing config colors alongside spec's design tokens

These deviations are acceptable. Prioritize working code over spec purity.

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
├── GROVEKEEPER_BUILD_PROMPT.md    # Canonical game spec (READ THIS FIRST)
├── CLAUDE.md                       # This file
├── AGENTS.md                       # Multi-agent orchestration guide
├── memory-bank/                    # Persistent project context
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component → Game
│   ├── game/
│   │   ├── Game.tsx                # Screen router (menu | playing)
│   │   ├── scenes/
│   │   │   └── GameScene.tsx       # BabylonJS canvas + game loop
│   │   ├── ecs/
│   │   │   ├── world.ts            # Miniplex World + queries
│   │   │   └── archetypes.ts       # Entity factory functions
│   │   ├── systems/
│   │   │   ├── growth.ts           # Tree growth system
│   │   │   ├── movement.ts         # Player movement system
│   │   │   ├── time.ts             # Day/night + season cycle
│   │   │   ├── quests.ts           # Quest/goal generation
│   │   │   └── platform.ts         # Capacitor haptics bridge
│   │   ├── stores/
│   │   │   └── gameStore.ts        # Zustand persistent state
│   │   ├── constants/
│   │   │   ├── config.ts           # Grid size, colors, growth stages
│   │   │   ├── trees.ts            # Tree species definitions
│   │   │   └── tools.ts            # Tool definitions
│   │   ├── ui/
│   │   │   ├── MainMenu.tsx        # Start screen
│   │   │   ├── HUD.tsx             # In-game overlay
│   │   │   ├── GameUI.tsx          # HUD + joystick + dialogs
│   │   │   ├── Joystick.tsx        # nipplejs wrapper
│   │   │   ├── Logo.tsx            # SVG logo
│   │   │   ├── FarmerMascot.tsx    # SVG farmer "Fern"
│   │   │   ├── ToolWheel.tsx       # Tool selection dialog
│   │   │   ├── SeedSelect.tsx      # Species picker dialog
│   │   │   ├── PauseMenu.tsx       # Pause overlay
│   │   │   ├── TimeDisplay.tsx     # Day/night/season indicator
│   │   │   ├── QuestPanel.tsx      # Active quest tracker
│   │   │   └── RulesModal.tsx      # First-time tutorial
│   │   └── types.ts                # Core type definitions
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   └── next/                   # Next.js shims (legacy, can remove)
│   ├── hooks/
│   │   ├── use-mobile.ts           # Mobile detection hook
│   │   └── use-media-query.tsx     # Responsive breakpoint hook
│   └── lib/
│       └── utils.ts                # cn() utility for Tailwind
├── docs/                           # Design documentation
├── public/                         # Static assets
├── capacitor.config.ts             # Capacitor native config
├── biome.json                      # Linter/formatter config
├── vitest.config.ts                # Test runner config
├── vite.config.ts                  # Bundler config
└── tsconfig.json                   # TypeScript config
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

- **ECS (Miniplex):** Runtime game state — entity positions, growth progress, tile states. Lives in memory, serialized for saves.
- **Zustand (gameStore):** Persistent player state — level, XP, coins, unlocks, settings, quest progress. Auto-persisted to localStorage via `persist` middleware.
- **Rule:** If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in Zustand.

### BabylonJS Scene Management

The 3D scene is imperative (not declarative React). `GameScene.tsx` manages:
- Engine + Scene initialization
- Camera (locked isometric ArcRotateCamera)
- Lighting (hemisphere + directional)
- Ground (procedural grass texture + grid overlay)
- Player mesh (composed from BabylonJS primitives)
- Tree meshes (procedural, mapped from ECS entities via `treeMeshesRef`)
- Game loop (`engine.runRenderLoop`)

All mesh references are stored in React refs, not state. BabylonJS operates outside React's render cycle.

### Component Conventions

- Named exports only (never `export default`)
- Props typed with `interface Props`
- shadcn/ui for dialogs, buttons, cards, progress bars
- Inline styles for game-specific colors (from `COLORS` constants)
- Tailwind for layout and responsive utilities

## Performance Budgets

| Metric | Target |
|--------|--------|
| FPS (mobile) | >= 55 |
| FPS (desktop) | >= 60 |
| Initial bundle (gz) | < 500 KB |
| Time to interactive | < 3s |
| Memory (mobile) | < 100 MB |
| Draw calls | < 50 |

### Key Optimizations

- Tree-shake BabylonJS: import specific modules, never barrel exports
- Instance meshes for same-species same-stage trees
- Freeze world matrices on static meshes (tiles, ground)
- Shadow map: 1024px desktop, 512px mobile
- Passive event listeners for touch
- Dynamic import: split MainMenu vs GameScene

## Testing Approach

Write tests first for:
- Pure utility functions (grid math, RNG, growth calculations)
- ECS systems (mock world, verify state changes)
- Store actions (verify state transitions)
- Component rendering (mock data, verify display)

Test files live adjacent to source: `*.test.ts(x)` or in `src/game/stores/`, `src/game/systems/`.

```bash
# Run specific test
pnpm test -- growth

# Watch mode (default)
pnpm test

# Coverage report
pnpm test:coverage
```

## What's Built vs What's Missing

### Working Systems
- Game loop with BabylonJS rendering
- Isometric camera (locked diorama view)
- Farmer mesh + movement (joystick + WASD)
- Grid initialization (12x12 soil tiles)
- Basic tree planting flow (shovel → seed select → plant)
- Tree growth system (time-based progression)
- Watering, fertilizing, harvesting (axe) actions
- Day/night cycle with dynamic sky colors
- Season system with visual changes
- Quest/goal generation and tracking
- Zustand store with localStorage persistence
- Main menu with continue/new game
- HUD with coins, XP, level, tools, time
- Haptic feedback via Capacitor

### Needs Implementation (Production Gaps)
- **From Spec:** Proper 5-stage growth (currently 7 stages, spec says 5)
- **From Spec:** 8 tree species (currently 6, missing Willow + Baobab; spec uses different names)
- **From Spec:** Stamina system (not implemented)
- **From Spec:** Proper resource economy (Timber/Sap/Fruit/Acorns — currently just coins)
- **From Spec:** Tool belt HUD (bottom-right, 2x4 grid)
- **From Spec:** Achievement system
- **From Spec:** Prestige system (level 25+)
- **From Spec:** Proper save/load with offline growth calculation
- **From Spec:** Grid expansion (16, 20, 24, 32)
- **From Spec:** Tile types beyond soil (water, rock, path)
- **From Spec:** Weather events
- **From Spec:** Seeded procedural RNG for deterministic tree meshes
- **From Spec:** Species-specific tree meshes (pine cones, willow strands, etc.)
- **From Spec:** Design tokens CSS (spec's color system)
- **From Spec:** Typography (Fredoka + Nunito fonts)
- **Polish:** Floating number particles (+XP, +Timber)
- **Polish:** Toast notification system
- **Polish:** Growth animations (smooth scale interpolation)
- **Polish:** Seasonal canopy color shifts on player trees
- **Polish:** PWA manifest + service worker
- **Tech Debt:** Remove Next.js shims (`src/components/next/`)
- **Tech Debt:** Clean up Onlook iframe editor script from `index.html`
- **Tech Debt:** Align ECS entity types with spec's component interfaces

## Key Files to Read First

When starting any work session, read these files in order:

1. `GROVEKEEPER_BUILD_PROMPT.md` — The spec (skim relevant sections)
2. `memory-bank/activeContext.md` — Current work focus
3. `memory-bank/progress.md` — What's done, what's next
4. `src/game/Game.tsx` — Screen routing
5. `src/game/scenes/GameScene.tsx` — The game loop + 3D scene
6. `src/game/stores/gameStore.ts` — All persistent state

## Mobile-First Development Checklist

Before merging any UI change, verify:

- [ ] Renders correctly at 375px width (iPhone SE portrait)
- [ ] Touch targets >= 44px
- [ ] No overlap with joystick zone (bottom-left 200x200px)
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zooming (minimum 14px body)
- [ ] Dialogs don't extend beyond viewport
- [ ] Canvas has `touch-action: none`
- [ ] Animations respect `prefers-reduced-motion`
- [ ] FPS >= 55 on mid-range mobile
