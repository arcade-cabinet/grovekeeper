# State Management

Grovekeeper splits state across two systems: **Miniplex ECS** for per-frame runtime data and **Zustand** for persistent player data. This document covers the Zustand store in detail.

## Store Architecture

The game store is defined in `src/game/stores/gameStore.ts` using Zustand 5.x with the `persist` middleware:

```typescript
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({ ... }),
    { name: "grove-keeper-save" }
  )
);
```

All persistent state is automatically synced to `localStorage` under the key `grove-keeper-save`.

## State Shape

### Core Player State

| Field              | Type           | Default        | Description                              |
|--------------------|----------------|----------------|------------------------------------------|
| `screen`           | `GameScreen`   | `"menu"`       | Current screen: menu, playing, paused, seedSelect, rules |
| `selectedTool`     | `string`       | `"trowel"`     | Currently active tool ID                 |
| `selectedSpecies`  | `string`       | `"white-oak"`  | Currently selected tree species for planting |
| `coins`            | `number`       | `100`          | Legacy currency (kept for backward compat) |
| `xp`               | `number`       | `0`            | Cumulative XP earned                     |
| `level`            | `number`       | `1`            | Current player level                     |
| `unlockedTools`    | `string[]`     | `["trowel", "watering-can"]` | Tool IDs the player has access to |
| `unlockedSpecies`  | `string[]`     | `["white-oak"]` | Species IDs the player can plant        |

### Progress Counters

| Field              | Type     | Description                                    |
|--------------------|----------|------------------------------------------------|
| `treesPlanted`     | `number` | Cumulative trees planted (all sessions)        |
| `treesMatured`     | `number` | Trees that reached Mature stage                |
| `treesHarvested`   | `number` | Trees chopped with the Axe                     |
| `treesWatered`     | `number` | Watering actions performed                     |

### Time State

| Field                  | Type     | Description                                  |
|------------------------|----------|----------------------------------------------|
| `gameTimeMicroseconds` | `number` | Microsecond-precision game clock             |
| `currentSeason`        | `Season` | Current season: spring, summer, autumn, winter |
| `currentDay`           | `number` | Current day within the game year             |

### Resources and Economy

| Field               | Type                          | Description                          |
|----------------------|-------------------------------|--------------------------------------|
| `resources`          | `Record<ResourceType, number>` | Current resource balances (timber, sap, fruit, acorns) |
| `seeds`              | `Record<string, number>`      | Seed inventory by species ID         |
| `lifetimeResources`  | `Record<ResourceType, number>` | All-time resource totals (for achievements) |

### Stamina

| Field         | Type     | Default | Description                          |
|---------------|----------|---------|--------------------------------------|
| `stamina`     | `number` | `100`   | Current stamina                      |
| `maxStamina`  | `number` | `100`   | Maximum stamina (increased by prestige) |

### Progression

| Field               | Type            | Description                              |
|----------------------|-----------------|------------------------------------------|
| `achievements`       | `string[]`      | IDs of earned achievements               |
| `seasonsExperienced` | `string[]`      | Distinct seasons the player has lived through |
| `speciesPlanted`     | `string[]`      | Distinct species IDs ever planted        |
| `gridSize`           | `number`        | Current grid dimension (default 12)      |
| `prestigeCount`      | `number`        | Number of times the player has prestiged |
| `activeBorderCosmetic` | `string | null` | Active cosmetic border theme ID        |

### Quest State

| Field              | Type             | Description                               |
|--------------------|------------------|-------------------------------------------|
| `activeQuests`     | `ActiveQuest[]`  | Currently active quests/goals             |
| `completedQuestIds` | `string[]`      | IDs of completed quests                   |
| `completedGoalIds` | `string[]`       | IDs of completed individual goals         |
| `lastQuestRefresh` | `number`         | Timestamp of last quest pool refresh      |

### Grove Serialization

| Field       | Type             | Description                                    |
|-------------|------------------|------------------------------------------------|
| `groveData` | `GroveData | null` | Serialized tree entities + player position   |

```typescript
interface GroveData {
  trees: SerializedTree[];
  playerPosition: { x: number; z: number };
}
```

### Settings

| Field            | Type      | Default | Description                     |
|------------------|-----------|---------|---------------------------------|
| `hasSeenRules`   | `boolean` | `false` | Whether the tutorial has been shown |
| `hapticsEnabled` | `boolean` | `true`  | Haptic feedback toggle          |
| `soundEnabled`   | `boolean` | `true`  | Sound effects toggle            |

## XP and Leveling

The XP formula follows spec section 21:

```
xpToNext(level) = 100 + max(0, (level - 2) * 50) + floor((level - 1) / 5) * 200
```

Level 1 requires 100 XP. Every 5 levels adds a 200 XP plateau bonus, creating an accelerating curve. The `levelFromXp` function iterates the formula to determine the current level from cumulative XP.

When the player levels up, the store automatically:
1. Checks `levelUnlocks.ts` for newly unlocked tools and species.
2. Adds unlocks to `unlockedTools` and `unlockedSpecies`.
3. Queues toast notifications via `queueMicrotask()` to avoid side effects during `set()`.

## Actions

The store exposes actions for state mutations. All actions are synchronous and return the updated state slice.

### Resource Actions

| Action                | Signature                                      | Description                       |
|-----------------------|------------------------------------------------|-----------------------------------|
| `addResource`         | `(type: ResourceType, amount: number) => void` | Adds to both current and lifetime |
| `spendResource`       | `(type: ResourceType, amount: number) => boolean` | Returns false if insufficient  |
| `addSeed`             | `(speciesId: string, amount: number) => void`  | Adds seeds to inventory           |
| `spendSeed`           | `(speciesId: string, amount: number) => boolean` | Returns false if insufficient  |

### Progression Actions

| Action                   | Description                                          |
|--------------------------|------------------------------------------------------|
| `addXp(amount)`          | Awards XP, auto-levels, auto-unlocks tools/species   |
| `expandGrid()`           | Spends resources to expand grid to next tier          |
| `performPrestige()`      | Resets progress with permanent bonuses (level 25+ required) |
| `unlockAchievement(id)`  | Records an achievement (idempotent)                  |

### Persistence Actions

| Action                         | Description                                |
|--------------------------------|--------------------------------------------|
| `saveGrove(trees, playerPos)`  | Serializes current grove state to store    |
| `resetGame()`                  | Resets all state to initial values         |

## Side Effect Pattern

Zustand's `set()` is synchronous and should not trigger side effects. The codebase uses `queueMicrotask()` to defer notifications:

```typescript
addXp: (amount) =>
  set((state) => {
    const newLevel = levelFromXp(state.xp + amount);
    if (newLevel > state.level) {
      // Defer toast to avoid side effect inside set()
      queueMicrotask(() => {
        showToast(`Level ${newLevel}!`, "success");
      });
    }
    return { xp: state.xp + amount, level: newLevel };
  }),
```

This pattern is used consistently for level-up notifications, prestige announcements, and grid expansion confirmations.

## Persistence Details

- **Storage key:** `grove-keeper-save`
- **Middleware:** `zustand/persist` with default JSON serialization
- **Auto-save triggers:** Tab visibility change, 30-second interval, manual plant/harvest (debounced 1 second)
- **Manual reset:** `resetGame()` restores all fields to `initialState`

## Accessing the Store

In React components, use the hook:

```typescript
const { level, xp, resources } = useGameStore();
```

Outside React (in the game loop), use the static accessor:

```typescript
const state = useGameStore.getState();
state.addXp(50);
```
