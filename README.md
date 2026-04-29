---
title: Grovekeeper
updated: 2026-04-29
status: current
---

# Grovekeeper

*Every forest begins with a single seed.*

**Grovekeeper** is a third-person voxel tree-tending and grove-building game. You are **The Gardener** — wander an infinite biome-typed outer world, discover glowing Groves, claim them with a Hearth, and build a fast-travel network of peaceful towns. Mobile-first PWA for 3–15 minute sessions.

## Quick Start

```bash
# Install dependencies
pnpm install

# Development server (HMR enabled)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests (watch mode)
pnpm test

# Run tests in browser
pnpm test:browser

# Lint and format check
pnpm check

# TypeScript type check
pnpm tsc
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Engine | `@jolly-pixel/engine` v2.5 | Three.js-based ECS, Actor/ActorComponent, ModelRenderer |
| Voxel renderer | `@jolly-pixel/voxel.renderer` v1.4 | Chunk renderer, PNG tilesets, blockRegistry |
| Runtime | `@jolly-pixel/runtime` v3.3 | Boot wrapper, GPU tier detection |
| ECS + State | Koota | Pure game state (inventory, groves, quests); persisted via drizzle |
| UI | SolidJS 1.9 | Overlay HUD, menus, crafting surface |
| Audio | Engine AudioManager / AudioLibrary | Howler-backed; recorded SFX/music from itch.io packs |
| Persistence | drizzle-orm + Capacitor SQLite / sql.js | Chunks, groves, inventory, dialogue history |
| Input | Engine Input + CombinedInput + nipplejs | Desktop keyboard + mobile virtual joystick |
| Bundler | Vite 6.x | |
| Language | TypeScript 5.7+ | Strict mode |
| Lint/Fmt | Biome 2.3 | Single tool for lint + format |
| Package Mgr | pnpm 10 | |
| Testing | Vitest 4.x (node + browser) + Playwright 1.59 | 16 screenshot gates, e2e journey suite |
| Mobile | Capacitor 8.x | PWA + native iOS/Android bridge |

## Project Structure

```text
grovekeeper/
├── src/
│   ├── game/               # Game scenes, actors, world systems
│   ├── systems/            # Pure-function ECS systems (growth, combat, harvest, …)
│   ├── config/             # JSON-backed config (trees, difficulty, audio, …)
│   ├── ui/                 # SolidJS overlay HUD and menus
│   ├── audio/              # Biome music coordinator + SFX dispatch
│   ├── persistence/        # drizzle schema + Capacitor SQLite init
│   ├── ecs/                # Solid↔Koota reactive hooks
│   ├── traits.ts           # Central Koota trait catalog
│   └── main.tsx            # Entry point
├── public/assets/          # Tilesets, GLB models, audio packs
├── e2e/                    # Playwright e2e + RC journey screenshot suite
├── docs/                   # Design, architecture, state, TESTING
├── capacitor.config.ts
├── vite.config.ts
└── vitest.config.ts
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Tech stack, architecture rules, common commands
- **[docs/README.md](docs/README.md)** — Documentation index
- **[docs/STATE.md](docs/STATE.md)** — Current wave status and open QA items
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Engine layering and persistence stack

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Development Notes

- **Mobile-first:** All UI optimized for 375px portrait (iPhone SE). Touch targets ≥ 44px.
- **Performance:** Target ≥ 55 FPS on mid-range mobile, ≥ 60 FPS on desktop.
- **Tests:** 1159 tests across 81 test files. Run `pnpm test` for watch mode.
- **Type safety:** TypeScript strict mode. Run `pnpm tsc` to verify.
- **Code quality:** Biome lint + format enforced. Run `pnpm check` to check.

## Live Game

Grovekeeper is published as a PWA and desktop web app:
https://arcade-cabinet.github.io/grovekeeper/
