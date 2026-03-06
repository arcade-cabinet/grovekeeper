# CLAUDE.md -- Grovekeeper

**Grovekeeper** is a cozy 2.5D isometric tree-planting simulation / idle tending game. Mobile-first native app (portrait-primary), built with Expo and React Three Fiber. Target session: 3-15 minutes (commute-friendly).

**Tagline:** *"Every forest begins with a single seed."*

> For comprehensive agent orchestration, memory bank structure, and coordination protocols, see **[AGENTS.md](./AGENTS.md)**.
> For persistent project context (current focus, progress, active decisions), see **[memory-bank/](./memory-bank/)**.
> For game design, architecture, and brand documentation, see **[docs/](./docs/)**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 |
| Runtime | React 19, React Native 0.83 |
| 3D Engine | React Three Fiber + drei |
| ECS | Miniplex 2.x |
| State | Zustand 5.x (persistent via expo-sqlite) |
| AI/Behavior | Yuka 0.7 |
| Database | expo-sqlite + drizzle-orm |
| Styling | NativeWind 4 + React Native Reusables |
| Language | TypeScript 5.9, strict mode |
| Lint/Fmt | Biome |
| Testing | Jest + Maestro (E2E) |
| Package Mgr | pnpm |

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Expo dev server
pnpm android          # Run on Android
pnpm ios              # Run on iOS
pnpm web              # Run on web
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run Maestro E2E tests
pnpm lint             # Lint + format check
pnpm format           # Format with Biome
pnpm check            # Full check (lint + format, write fixes)
pnpm tsc              # TypeScript type check
```

## Mobile-First is Non-Negotiable

Every decision -- UI layout, performance budgets, touch targets -- must prioritize mobile portrait mode.

- All touch targets: minimum 44x44px
- Test at 375px width (iPhone SE) as the minimum viewport
- Portrait-first layout; landscape is a graceful enhancement
- Haptic feedback on supported devices

## State Split: ECS vs Zustand

- **ECS (Miniplex):** Runtime game state -- entity positions, growth progress, tile states. Lives in memory.
- **Zustand:** Persistent player state -- level, XP, resources, unlocks, settings, stamina, prestige. Persisted via expo-sqlite.
- **Rule:** If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in Zustand.

## Architecture: Declarative R3F Scene

The 3D scene is **declarative** via React Three Fiber components (NOT imperative like the old BabylonJS approach). Scene elements are React components rendered inside an R3F `<Canvas>`:

- **Camera, Lighting, Sky, Ground** -- R3F scene components in `components/scene/`
- **Player, Trees, NPCs, Structures** -- R3F entity components in `components/entities/`
- **SelectionRing** -- R3F interaction component in `components/scene/`
- **HUD, menus, overlays** -- React Native UI in `components/game/`

Systems remain pure functions: `(world, deltaTime, ...context) => void`.

## Project Structure

```
grovekeeper/
├── CLAUDE.md                         # This file
├── AGENTS.md                         # Multi-agent orchestration guide
├── memory-bank/                      # Persistent project context
├── docs/                             # Game design, architecture, brand docs
├── app/                              # Expo Router screens
│   ├── _layout.tsx                   # Root layout
│   ├── index.tsx                     # Main menu screen
│   └── game/
│       └── index.tsx                 # Game screen
├── components/                       # React Native + R3F components
│   ├── ui/                           # Base UI (button, text, icon)
│   ├── game/                         # Game UI (HUD, menus, popups)
│   │   ├── HUD.tsx
│   │   ├── MainMenu.tsx
│   │   ├── PauseMenu.tsx
│   │   ├── ResourceBar.tsx
│   │   ├── StaminaGauge.tsx
│   │   ├── XPBar.tsx
│   │   ├── TimeDisplay.tsx
│   │   ├── ToolBelt.tsx
│   │   ├── ActionButton.tsx
│   │   ├── AchievementPopup.tsx
│   │   └── Toast.tsx
│   ├── scene/                        # R3F scene components
│   │   ├── Camera.tsx
│   │   ├── Lighting.tsx
│   │   ├── Sky.tsx
│   │   ├── Ground.tsx
│   │   └── SelectionRing.tsx
│   └── entities/                     # R3F entity components
├── config/                           # JSON config hierarchy
│   ├── theme.json                    # Colors, typography, spacing
│   ├── game/                         # Game balance data
│   │   ├── species.json              # 15 tree species catalog
│   │   ├── tools.json                # 8 tools + stamina costs
│   │   ├── resources.json            # Resource type definitions
│   │   ├── growth.json               # Stage names, multipliers, timing
│   │   ├── weather.json              # Event probabilities, multipliers
│   │   ├── achievements.json         # Trigger conditions, display data
│   │   ├── prestige.json             # Tiers, bonuses, cosmetic themes
│   │   ├── grid.json                 # Expansion tiers, costs, sizes
│   │   ├── npcs.json                 # NPC template definitions
│   │   ├── dialogues.json            # Dialogue trees
│   │   ├── quests.json               # Quest chain definitions
│   │   └── difficulty.json           # Difficulty multipliers
│   └── world/                        # World data
│       ├── starting-world.json       # Zone definitions
│       ├── blocks.json               # Block catalog
│       ├── structures.json           # Structure recipes
│       ├── encounters.json           # Random encounters
│       └── festivals.json            # Seasonal festivals
├── game/                             # Game logic (engine-agnostic)
│   ├── ecs/                          # Miniplex ECS (world, archetypes, queries)
│   │   ├── world.ts
│   │   ├── archetypes.ts
│   │   └── react.ts
│   ├── systems/                      # Pure game systems
│   │   ├── time.ts
│   │   ├── gridExpansion.ts
│   │   ├── levelUnlocks.ts
│   │   ├── prestige.ts
│   │   ├── achievements.ts
│   │   ├── quests.ts
│   │   ├── seasonalMarket.ts
│   │   ├── supplyDemand.ts
│   │   ├── marketEvents.ts
│   │   ├── travelingMerchant.ts
│   │   ├── toolUpgrades.ts
│   │   ├── wildTreeRegrowth.ts
│   │   ├── zoneBonuses.ts
│   │   ├── speciesDiscovery.ts
│   │   └── AudioManager.ts
│   ├── stores/                       # Zustand persistent state
│   │   └── gameStore.ts
│   ├── hooks/                        # Custom hooks (useInput, useMovement)
│   │   ├── useInput.ts
│   │   └── useMovement.ts
│   ├── ai/                           # Yuka NPC AI (brains, governor)
│   ├── npcs/                         # NPC management
│   ├── quests/                       # Quest system (types, chain engine)
│   ├── events/                       # Event system (types, scheduler)
│   ├── world/                        # World generation, zone loading
│   ├── structures/                   # Structure placement + effects
│   ├── actions/                      # Game action dispatcher
│   ├── config/                       # Runtime config loaders
│   │   ├── species.ts
│   │   ├── resources.ts
│   │   └── tools.ts
│   ├── db/                           # expo-sqlite + drizzle-orm
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── index.ts
│   ├── ui/                           # Game-specific UI utilities
│   │   └── Toast.ts
│   └── utils/                        # Pure utilities
│       ├── treeGeometry.ts           # Three.js procedural tree geometry
│       └── seedRNG.ts                # Seeded RNG
├── lib/                              # Shared utilities (cn(), etc.)
├── assets/                           # Textures, models, fonts
├── .maestro/                         # Maestro E2E test flows
├── app.json                          # Expo config
├── tailwind.config.js                # NativeWind theme config
├── metro.config.js                   # Metro bundler config
├── jest.config.ts                    # Jest test config
├── jest.setup.ts                     # Jest setup (mocks)
├── drizzle.config.ts                 # Drizzle ORM config
├── biome.json                        # Linter/formatter config
└── tsconfig.json                     # TypeScript config
```

## Key Files to Read First

When starting any work session:

1. `docs/README.md` -- Documentation index
2. `memory-bank/activeContext.md` -- Current work focus
3. `memory-bank/progress.md` -- What's done, what's next
4. `app/game/index.tsx` -- Game screen (R3F Canvas + HUD)
5. `game/stores/gameStore.ts` -- All persistent state
6. `game/ecs/world.ts` -- Miniplex world + queries
7. `game/utils/treeGeometry.ts` -- Three.js procedural tree generation
8. `config/game/species.json` -- Tree species catalog
9. `components/scene/Camera.tsx` -- R3F camera setup
10. `components/game/HUD.tsx` -- HUD component layout

## Key Principles

1. **Read AGENTS.md** for agent roles, coordination, and memory bank protocol
2. **Read memory-bank/activeContext.md** at the start of every task
3. **Named exports only** -- never `export default`
4. **Systems are pure functions:** `(world, deltaTime, ...context) => void`
5. **No barrel imports** from 3D libraries -- import specific modules
6. **Tests adjacent to source** (e.g., `game/ecs/world.test.ts`)
7. **Declarative scene** -- R3F components, not imperative Three.js calls
8. **Path alias:** `@/` maps to project root (e.g., `@/game/stores/gameStore`)

## Performance Budgets

| Metric | Target |
|--------|--------|
| FPS (mobile) | >= 55 |
| FPS (desktop) | >= 60 |
| Time to interactive | < 3s |
| Memory (mobile) | < 100 MB |
| Draw calls | < 50 |

### Key Optimizations

- Instanced meshes for same-species same-stage trees (drei `<Instances>`)
- Freeze world matrices on static meshes
- Minimize draw calls via merging and instancing
- Code splitting via Expo Router
- Lerp-based growth animations: `Math.min(1, dt * speed)` for frame-rate independence

## Testing

Test files live adjacent to source: `*.test.ts(x)`.

```bash
pnpm test                    # Watch mode
pnpm test -- --run           # Single run (CI)
pnpm test:coverage           # With coverage
pnpm test:e2e                # Maestro mobile E2E
```

Write tests first for:
- Pure utility functions (grid math, RNG, growth calculations)
- ECS systems (mock world, verify state changes)
- Store actions (verify state transitions)
- Hooks (mock dependencies, verify behavior)

## Mobile-First Development Checklist

Before merging any UI change, verify:

- [ ] Renders correctly at 375px width (iPhone SE portrait)
- [ ] Touch targets >= 44px
- [ ] No overlap with bottom action bar
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zooming (minimum 14px body)
- [ ] Dialogs don't extend beyond viewport
- [ ] Animations respect `prefers-reduced-motion`
- [ ] FPS >= 55 on mid-range mobile
