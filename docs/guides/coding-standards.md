# Coding Standards

This document defines the coding conventions enforced across the Grovekeeper codebase. Consistency is maintained through Biome 2.3 for automated linting and formatting, TypeScript for type safety, and Vitest for testing.

## File Naming

| Type        | Convention        | Examples                                   |
|-------------|-------------------|--------------------------------------------|
| Components  | PascalCase.tsx    | `GameUI.tsx`, `ToolBelt.tsx`, `HUD.tsx`    |
| Systems     | camelCase.ts      | `growth.ts`, `weather.ts`, `stamina.ts`    |
| Utilities   | camelCase.ts      | `seedRNG.ts`, `treeMeshBuilder.ts`         |
| Constants   | camelCase.ts      | `trees.ts`, `tools.ts`, `config.ts`        |
| Stores      | camelCaseStore.ts | `gameStore.ts`                             |
| Hooks       | useCamelCase.ts   | `useKeyboardInput.ts`, `use-mobile.ts`     |
| Tests       | *.test.ts(x)      | `growth.test.ts`, `gameStore.test.ts`      |

Test files are co-located with their source files, not in a separate `__tests__` directory.

## Import Order

Biome enforces organized imports via the `assist.actions.source.organizeImports` rule. The expected order is:

1. **React / framework** -- `react`, `react-dom`
2. **Third-party** -- `@babylonjs/*`, `zustand`, `nipplejs`, `miniplex`
3. **Internal absolute** -- `@/components/*`, `@/lib/*`, `@/hooks/*`
4. **Relative game imports** -- `../stores/*`, `../systems/*`, `../constants/*`
5. **Style imports** (if any)

Type-only imports use the `import type` syntax:

```typescript
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
```

## Component Conventions

### Named Exports Only

All components use named exports. Default exports are not used:

```typescript
// Correct
export const GameUI = () => { ... };

// Incorrect
export default function GameUI() { ... }
```

### Props Interface

Component props are typed with a `Props` interface or destructured inline:

```typescript
interface Props {
  onMove: (x: number, z: number) => void;
  onAction: () => void;
  gameTime: GameTime | null;
}

export const GameUI = ({ onMove, onAction, gameTime }: Props) => { ... };
```

### UI Primitives

- **shadcn/ui** for structural components: `Dialog`, `Button`, `Card`, `Progress`, `Tabs`.
- **Tailwind CSS** for layout, spacing, and responsive utilities.
- **Inline styles** for game-specific colors sourced from the `COLORS` constant in `config.ts`.

```typescript
// shadcn/ui for structure
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-sm">
    {/* Tailwind for layout */}
    <div className="grid grid-cols-2 gap-2 p-4">
      {/* Inline style for game color */}
      <div style={{ backgroundColor: COLORS.forestGreen }}>
```

### Mobile-First Responsive Design

Tailwind breakpoints are used for desktop adaptations:

```typescript
// Mobile-first: base styles are for mobile
// Desktop overrides use sm:, md:, lg: prefixes
<div className="flex flex-col md:flex-row">
  <div className="w-full md:w-1/2">
```

Touch targets must be at least 44x44px. The joystick zone (bottom-left 200x200px) must remain clear of overlapping UI.

## System Conventions

### Pure Function Pattern

ECS systems are pure functions with no side effects:

```typescript
export function growthSystem(
  deltaTime: number,
  currentSeason: string,
  weatherMultiplier: number,
): void {
  for (const entity of treesQuery) {
    // Read components
    // Compute new values
    // Mutate component state in place
  }
}
```

Systems must not:
- Import from `gameStore.ts` directly.
- Show toasts, notifications, or popups.
- Create or destroy entities.

The game loop in `GameScene.tsx` handles all side effects based on system output.

### Constants Over Magic Numbers

All balance values, multipliers, and thresholds live in `src/game/constants/`:

```typescript
// constants/config.ts
export const SEASON_GROWTH_MULTIPLIERS: Record<string, number> = {
  spring: 1.5,
  summer: 1.0,
  autumn: 0.8,
  winter: 0.0,
};

export const WATER_BONUS = 1.3;
export const MAX_STAGE = 4;
```

Systems reference these constants instead of hardcoding values.

## Biome Configuration

The Biome configuration in `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

Key rules:
- **2-space indentation** with spaces (not tabs).
- **Recommended lint rules** enabled (covers most common issues).
- **Organized imports** automatically sorted on format.

Run checks with `pnpm check` before committing.

## TypeScript Configuration

The project uses relaxed TypeScript settings (strict mode is off):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": false,
    "noImplicitAny": false,
    "noEmit": true
  }
}
```

While strict mode is disabled at the compiler level, the codebase uses explicit types for interfaces, function parameters, and return types. Type assertions (`as`) are used sparingly and only where necessary.

## Testing Standards

### Framework

- **Vitest 4.x** for test execution.
- **happy-dom** as the DOM environment.
- **@testing-library/react** for component tests.

### Test Structure

Tests follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe("growthSystem", () => {
  it("should advance tree progress based on species growth rate", () => {
    // Arrange
    const entity = createTestTree("white-oak", { stage: 0, progress: 0 });

    // Act
    growthSystem(1.0, "spring", 1.0);

    // Assert
    expect(entity.tree!.progress).toBeGreaterThan(0);
  });
});
```

### What to Test

| Category         | What to Cover                                         | Test File Location   |
|------------------|-------------------------------------------------------|---------------------|
| Systems          | State transitions, edge cases, formula correctness    | `systems/*.test.ts` |
| Store actions    | State mutations, guard conditions, side effects       | `stores/*.test.ts`  |
| Pure utilities   | Grid math, RNG, growth calculations                   | `utils/*.test.ts`   |
| Components       | Render output, user interaction, conditional display  | `ui/*.test.tsx`     |

### Mocking Patterns

For system tests, mock the ECS world:

```typescript
import { world, treesQuery } from "../ecs/world";

beforeEach(() => {
  // Clear world between tests
  for (const entity of world.entities) {
    world.remove(entity);
  }
});
```

For store tests, use `vi.mock` with inline factories (Vitest hoists mock factories, so they cannot reference outer constants):

```typescript
vi.mock("../ui/Toast", () => ({
  showToast: vi.fn(),
}));
```

### Test Statistics

The codebase maintains 410+ tests across 21 test files:

```
src/game/systems/growth.test.ts
src/game/systems/weather.test.ts
src/game/systems/achievements.test.ts
src/game/systems/prestige.test.ts
src/game/systems/gridExpansion.test.ts
src/game/systems/levelUnlocks.test.ts
src/game/systems/offlineGrowth.test.ts
src/game/systems/harvest.test.ts
src/game/systems/saveLoad.test.ts
src/game/systems/gridGeneration.test.ts
src/game/systems/movement.test.ts
src/game/systems/stamina.test.ts
src/game/stores/gameStore.test.ts
src/game/utils/treeMeshBuilder.test.ts
... and others
```
