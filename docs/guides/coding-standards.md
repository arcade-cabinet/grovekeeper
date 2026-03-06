# Coding Standards

This document defines the coding conventions enforced across the Grovekeeper codebase. Consistency is maintained through Biome 2.3 for automated linting and formatting, TypeScript for type safety, and Jest for testing.

## File Naming

| Type        | Convention        | Examples                                   |
|-------------|-------------------|--------------------------------------------|
| Components  | PascalCase.tsx    | `GameUI.tsx`, `ToolBelt.tsx`, `HUD.tsx`    |
| Systems     | camelCase.ts      | `growth.ts`, `weather.ts`, `stamina.ts`    |
| Utilities   | camelCase.ts      | `seedRNG.ts`, `treeGeometry.ts`            |
| Constants   | camelCase.ts      | `trees.ts`, `tools.ts`, `config.ts`        |
| Config      | kebab-case.json   | `species.json`, `starting-world.json`      |
| Stores      | camelCaseStore.ts | `gameStore.ts`                             |
| Hooks       | useCamelCase.ts   | `useInput.ts`, `useMovement.ts`            |
| Tests       | *.test.ts(x)      | `growth.test.ts`, `gameStore.test.ts`      |

Test files are co-located with their source files, not in a separate `__tests__` directory.

## Styling: NativeWind Everywhere

All styling uses NativeWind (Tailwind) classes. Avoid inline `style={{}}` objects except for truly dynamic computed values (e.g., calculated positions).

```typescript
// Correct: NativeWind classes
<View className="flex-row items-center gap-2 bg-bark-brown p-4">
  <Text className="text-forest-green text-lg font-heading">Level 5</Text>
</View>

// Avoid: inline styles for static values
<View style={{ flexDirection: 'row', backgroundColor: '#5D4037' }}>
```

Game-specific design tokens are defined in `config/theme.json` and extended into `tailwind.config.js`:

```
text-forest-green, bg-bark-brown, bg-soil-dark, text-leaf-light,
text-autumn-gold, bg-sky-mist, border-bark-brown
```

### Mobile-First Responsive Design

NativeWind breakpoints for desktop adaptations:

```typescript
// Mobile-first: base classes are for mobile
// Desktop overrides use sm:, md:, lg: prefixes
<View className="flex-col md:flex-row">
  <View className="w-full md:w-1/2">
```

Touch targets must be at least 44x44px.

## Import Order

Biome enforces organized imports via the `assist.actions.source.organizeImports` rule. The expected order is:

1. **React / framework** -- `react`, `react-native`, `expo-*`
2. **Third-party** -- `@react-three/fiber`, `zustand`, `miniplex`, `yuka`
3. **Internal absolute** -- `@/components/*`, `@/game/*`, `@/hooks/*`
4. **Relative imports** -- `../stores/*`, `../systems/*`

Type-only imports use the `import type` syntax:

```typescript
import type { Entity } from "@/game/ecs/world";
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

Component props are typed with a `Props` interface:

```typescript
interface Props {
  onMove: (x: number, z: number) => void;
  onAction: () => void;
}

export const GameUI = ({ onMove, onAction }: Props) => { ... };
```

### UI Primitives

- **React Native Reusables** for structural components: Dialog, Button, Card, Progress
- **NativeWind** for layout, spacing, and responsive utilities
- **config/theme.json** for game-specific design tokens

## JSON Config Files

All game balance data lives in JSON config files under `config/`, not hardcoded in TypeScript:

```
config/
  game/
    species.json         -- 15 tree species catalog
    tools.json           -- 8 tools + stamina costs
    growth.json          -- stage names, multipliers, timing
    weather.json         -- event probabilities, multipliers
    achievements.json    -- trigger conditions, display data
    prestige.json        -- tiers, bonuses, cosmetic themes
    grid.json            -- expansion tiers, costs, sizes
```

Systems import config data, not magic numbers:

```typescript
import speciesConfig from "@/config/game/species.json";
import growthConfig from "@/config/game/growth.json";
```

## System Conventions

### Pure Function Pattern

ECS systems are pure functions with no side effects:

```typescript
export function growthSystem(
  world: World,
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
- Import from `gameStore.ts` directly
- Show toasts, notifications, or popups
- Create or destroy entities

R3F components calling systems in `useFrame` handle all side effects.

## Biome Configuration

Key rules:
- **2-space indentation** with spaces (not tabs)
- **Recommended lint rules** enabled
- **Organized imports** automatically sorted on format

Run checks with `pnpm check` before committing.

## Commit Convention

Use conventional commits for `release-please` integration:

```
feat: add traveling merchant system
fix: correct growth rate for Ghost Birch at night
docs: update rendering architecture for R3F
test: add Jest tests for supply/demand pricing
chore: update Expo SDK to 55
```

## Testing Standards

### Framework

- **Jest** for unit and integration tests (Expo default)
- **Maestro** for mobile E2E flows

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
| Config validation| JSON schema integrity, required fields                | `config/*.test.ts`  |

### E2E with Maestro

Maestro flows test full game interactions:

```yaml
# .maestro/plant-tree.yaml
appId: com.grovekeeper.app
---
- tapOn: "New Game"
- tapOn: "Trowel"
- tapOn:
    point: "50%,50%"
- assertVisible: "Seed planted"
```

### Mocking Patterns

For system tests, mock the ECS world:

```typescript
import { world } from "../ecs/world";

beforeEach(() => {
  for (const entity of world.entities) {
    world.remove(entity);
  }
});
```
