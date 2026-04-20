---
title: Grovekeeper
updated: 2026-04-19
status: current
---

# Grovekeeper

*Every forest begins with a single seed.*

**Grovekeeper** is a cozy 2.5D isometric tree-planting simulation and idle tending game. Mobile-first PWA designed for portrait mode with 3–15 minute commute-friendly sessions. Plant, tend, and grow a thriving forest with procedural world generation, 15 unique tree species, weather systems, and crafting mechanics.

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
pnpm lint

# TypeScript type check
pnpm tsc
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | SolidJS 1.9 | Fine-grained reactivity, no VDOM |
| 3D Engine | BabylonJS 8.x | Scene rendering, procedural meshes, GPU instancing |
| ECS + State | Koota 0.6 | Single state system: runtime ECS + persistent traits |
| Audio | Tone.js 15 | All SFX synthesized; no raw Web Audio API |
| Input | InputManager (custom) | Unified pointer/keyboard/tap-to-move with A* pathfinding |
| Styling | Tailwind CSS 4.x | Hand-rolled Solid components |
| Bundler | Vite 6.x | Fast dev server, HMR, vite-plugin-solid |
| Language | TypeScript 5.7+ | Strict mode |
| Lint/Fmt | Biome 2.3 | Single tool for lint + format |
| Package Mgr | pnpm 10 | Fast, strict |
| Testing | Vitest 4.x + @solidjs/testing-library | Node (happy-dom) + Browser (playwright) |
| Mobile Native | Capacitor 8.x | PWA + native bridge |

## Project Structure

```
grovekeeper/
├── src/                    # Source code
│   ├── game/               # Game systems and scenes
│   ├── components/         # UI components
│   ├── hooks/              # Custom hooks
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── public/                 # Static assets, PWA manifest
├── docs/                   # Game design, architecture, brand documentation
├── capacitor.config.ts     # Capacitor native configuration
├── vite.config.ts          # Bundler config
├── vitest.config.ts        # Test runner config
└── package.json            # Dependencies and scripts
```

## Documentation

Complete design, architecture, and development guides are in the `docs/` directory:

- **[docs/README.md](docs/README.md)** — Documentation index
- **[docs/GAME_DESIGN_DOCUMENT.md](docs/GAME_DESIGN_DOCUMENT.md)** — Full game design
- **[docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md)** — Architecture overview
- **[docs/SYSTEMS.md](docs/SYSTEMS.md)** — Game systems reference

See [CHANGELOG.md](CHANGELOG.md) for version history and migration notes.

## Development Notes

- **Mobile-first:** All UI optimized for 375px portrait (iPhone SE). Touch targets ≥ 44px.
- **Performance:** Target ≥ 55 FPS on mid-range mobile, ≥ 60 FPS on desktop.
- **Tests:** 755 tests across 37 test files. Run `pnpm test` for watch mode.
- **Type safety:** TypeScript strict mode. Run `pnpm tsc` to verify.
- **Code quality:** Biome lint + format enforced. Run `pnpm lint` to check.

## Live Game

Grovekeeper is published as a PWA and desktop web app:
https://arcade-cabinet.github.io/grovekeeper/
