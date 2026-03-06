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

### Platform-Specific Requirements

**Android development:**
- Android Studio with Android SDK
- Java 17+ (`java --version`)
- `ANDROID_HOME` environment variable set

**iOS development (macOS only):**
- Xcode 15+
- CocoaPods (`pod --version`)

**Web development:**
- Any modern browser

## Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd grovekeeper
pnpm install
```

## Development

### Web

Start the Expo dev server for web:

```bash
pnpm dev
```

This opens the app in your default browser. Changes trigger fast refresh.

### Android

Run on a connected device or emulator:

```bash
pnpm android
```

### iOS (macOS only)

Run on the iOS simulator:

```bash
pnpm ios
```

### All Platforms

Start the Expo dev server with platform picker:

```bash
pnpm start
```

Press `w` for web, `a` for Android, `i` for iOS.

## Build

### Web Production Build

```bash
pnpm build:web
```

Output is written to the `dist/` directory.

### Android APK

```bash
pnpm build:android
```

Produces debug APKs via Expo CLI + Gradle (no EAS required).

## Testing

### Unit Tests (Jest)

```bash
# Watch mode (development)
pnpm test

# Single run (CI)
pnpm test --run

# Specific test pattern
pnpm test -- growth
pnpm test -- weather
pnpm test -- gameStore
```

Pure function tests (growth, weather, stamina, grid math, RNG) from the original Vitest suite are migrated to Jest.

### E2E Tests (Maestro)

```bash
# Run Maestro flows (requires running app)
maestro test .maestro/
```

Maestro flows test full game interactions on real devices/emulators.

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

Biome formats with 2-space indentation.

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

Runs the TypeScript compiler in `noEmit` mode to verify type correctness.

## Key Files to Read First

When starting development on Grovekeeper, read these files in order:

1. `CLAUDE.md` -- Project conventions, architecture patterns, complete systems list
2. `docs/README.md` -- Documentation index
3. `docs/AGENTS.md` -- How to navigate the docs directory
4. `memory-bank/activeContext.md` -- Current work focus and recent changes
5. `memory-bank/progress.md` -- Implementation status tracker
6. `src/game/stores/gameStore.ts` -- All persistent state and actions
7. `src/game/ecs/world.ts` -- ECS entity model and queries

## Available Scripts

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `pnpm dev`            | Start Expo dev server (web)              |
| `pnpm start`          | Start Expo dev server (platform picker)  |
| `pnpm android`        | Run on Android                           |
| `pnpm ios`            | Run on iOS simulator                     |
| `pnpm build:web`      | Web production build                     |
| `pnpm build:android`  | Android APK build                        |
| `pnpm test`           | Run tests (watch mode)                   |
| `pnpm test --run`     | Run tests once (CI)                      |
| `pnpm lint`           | Check for lint errors                    |
| `pnpm format`         | Auto-format source files                 |
| `pnpm check`          | Run lint + format checks                 |
| `pnpm tsc`            | TypeScript type check (no emit)          |

## Path Aliases

The project uses a `@/` path alias that maps to `src/`:

```typescript
import { cn } from "@/lib/utils";
import { useGameStore } from "@/game/stores/gameStore";
```

This is configured in `tsconfig.json` and resolved by Metro.
