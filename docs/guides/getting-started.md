# Getting Started

This guide covers how to set up, run, and build the Grovekeeper project locally.

## Prerequisites

| Requirement | Version | Check Command        |
|-------------|---------|----------------------|
| Node.js     | >= 20   | `node --version`     |
| pnpm        | >= 9    | `pnpm --version`     |

If you do not have pnpm installed, enable it via Node.js corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd grovekeeper
pnpm install
```

## Development

Start the development server with hot module replacement:

```bash
pnpm dev
```

The server starts at `http://localhost:5173`. Changes to source files trigger instant HMR updates.

### Development Server Notes

- The dev server uses Vite 6.x with the React plugin and Tailwind CSS plugin.
- BabylonJS modules are loaded on demand when entering the game scene.
- The main menu loads immediately; the 3D scene initializes when you click "New Game" or "Continue".
- Touch input works in desktop browser DevTools with mobile device emulation enabled.

## Build

Create a production build:

```bash
pnpm build
```

Output is written to the `dist/` directory. The build produces:
- A main chunk (~107 KB gzipped) containing React, UI, and store code.
- A BabylonJS chunk (~400 KB gzipped) loaded on demand.
- Static assets (textures, manifest, service worker).

## Preview

Preview the production build locally:

```bash
pnpm preview --port 8080
```

This serves the `dist/` directory at `http://localhost:8080`. Useful for testing production bundle splitting and load performance.

## Testing

### Watch Mode (Development)

```bash
pnpm test
```

Runs Vitest in watch mode. Tests re-run automatically when source files change. The test environment uses happy-dom for DOM simulation.

### Single Run (CI)

```bash
pnpm test:run
```

Runs all tests once and exits. Returns a non-zero exit code if any test fails.

### Coverage Report

```bash
pnpm test:coverage
```

Generates a coverage report. The project has 751 tests across 37 test files covering systems, stores, utilities, and components.

### Running Specific Tests

```bash
# Run tests matching a pattern
pnpm test -- growth
pnpm test -- weather
pnpm test -- gameStore
```

## Code Quality

### Lint

Check for lint errors:

```bash
pnpm lint
```

Uses Biome 2.3 with recommended rules enabled.

### Format

Auto-format all source files:

```bash
pnpm format
```

Biome formats with 2-space indentation by default.

### Full Check

Run both lint and format checks:

```bash
pnpm check
```

This is the recommended pre-commit check.

### TypeScript Type Check

```bash
pnpm tsc
```

Runs the TypeScript compiler in `noEmit` mode to verify type correctness without producing output files. The project uses ES2020 target with bundler module resolution.

## Project Entry Point

The application boots through this chain:

```text
src/main.tsx          -- ReactDOM.createRoot, renders <App />
  src/App.tsx         -- Root component, renders <Game />
    src/game/Game.tsx -- Screen router based on gameStore.screen
      "menu"   -> MainMenu.tsx
      "playing" -> GameScene.tsx (lazy-loaded)
```

## Key Files to Read First

When starting development on Grovekeeper, read these files in order:

1. `CLAUDE.md` -- Project conventions, architecture patterns, complete systems list.
2. `docs/README.md` -- Documentation index with links to all domains.
3. `memory-bank/activeContext.md` -- Current work focus and recent changes.
4. `memory-bank/progress.md` -- Implementation status tracker.
5. `src/game/Game.tsx` -- Screen routing logic.
6. `src/game/scenes/GameScene.tsx` -- The game loop and 3D scene setup.
7. `src/game/stores/gameStore.ts` -- All persistent state and actions.

## Available Scripts

| Script                | Command               | Description                              |
|-----------------------|-----------------------|------------------------------------------|
| `pnpm dev`            | `vite`                | Start dev server with HMR                |
| `pnpm build`          | `vite build`          | Production build                         |
| `pnpm preview`        | `vite preview --port 8080` | Preview production build            |
| `pnpm test`           | `vitest`              | Run tests in watch mode                  |
| `pnpm test:run`       | `vitest run`          | Run tests once (CI mode)                 |
| `pnpm test:coverage`  | `vitest run --coverage` | Generate coverage report               |
| `pnpm lint`           | `biome lint ./src`    | Check for lint errors                    |
| `pnpm format`         | `biome format --write ./src` | Auto-format source files          |
| `pnpm check`          | `biome check ./src`   | Run lint + format checks                |
| `pnpm tsc`            | `tsc`                 | TypeScript type check (no emit)          |
| `pnpm install-and-dev` | `pnpm install && pnpm dev` | Install deps and start dev server |

## Path Aliases

The project uses a `@/` path alias that maps to `src/`:

```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

This is configured in both `tsconfig.json` (for TypeScript) and `vite.config.ts` (for the bundler).
