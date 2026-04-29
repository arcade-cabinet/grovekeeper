---
title: State Management
updated: 2026-04-28
status: current
domain: technical
---

# State Management

Grovekeeper uses **Koota** as its unified state management system. Koota provides both ECS (Entity-Component-System) runtime data and persistent game state via traits.

## Architecture

State is split into two categories:

1. **World-level singleton traits** — Game-wide state (one instance per world)
   - `PlayerProgress` — coins, XP, level, unlocked tools/species
   - `Resources` / `LifetimeResources` — Timber, Sap, Fruit, Acorns balances
   - `Seeds` — Seed inventory (species → count)
   - `Tracking` — Telemetry counters (treesPlanted, treesHarvested, etc.)
   - `Quests` / `QuestChains` — Active/completed quests and chain state
   - `Settings` — `hasSeenRules`, `hapticsEnabled`, `soundEnabled`
   - `Achievements` — Unlocked achievement IDs
   - `Difficulty` — Difficulty tier ID and permadeath flag
   - `CurrentSeason` / `CurrentDay` / `Time` — Temporal state
   - `GameScreen` — Active UI screen (`"menu"`, `"playing"`, `"paused"`, ...)
   - `WorldMeta` — World seed, current zone, discovered zones
   - `Build` — Build mode, active template, placed structures
   - `SpeciesProgressTrait` — Species codex progress and pending unlocks
   - `Grid` — Grid size config

2. **Per-entity traits** — Runtime game objects
   - `Position` — (x, y, z) coordinates
   - `Tree` — Species, growth stage, water level
   - `FarmerState` — Player stamina, HP
   - `Npc` — Dialogue state
   - `Renderable` — Mesh reference + visibility
   - `Harvestable` — Harvestable type + yield
   - `IsPlayer` — Marks the player entity
   - `Structure` — Placed structure data
   - `Zone` / `InZone` — Zone membership
   - `GridCell` — Grid position

## Reading State in Components

Use the **Solid adapter** at `src/ecs/solid.ts` to read traits in SolidJS components:

```typescript
import { useTrait, useQuery, useQueryFirst, useHas } from "@/ecs/solid";

// Read a world-level trait
const resources = useTrait(koota, Resources);
// Returns: () => Resources (Solid signal accessor)
// Use: <div>{resources().timber}</div>

// Query all trees
const allTrees = useQuery(Tree, Position);
// Returns: () => Entity[] (Solid signal)

// Get player entity
const player = useQueryFirst(IsPlayer, FarmerState);

// Check if entity has a trait
const isHarvestable = useHas(tree, Harvestable);
```

All hooks return **Solid signals** (functions) that reactively track changes.

## Trait Update Patterns

```typescript
// Full overwrite (world-level trait)
koota.set(Resources, { timber: 50, sap: 10, fruit: 5, acorns: 3 });

// Functional update
koota.set(Resources, (prev) => ({ ...prev, timber: prev.timber + 10 }));

// Per-entity update
tree.set(Tree, { stage: 3, watered: false, speciesId: "white-oak" });

// Add/remove a trait
tree.add(Harvestable());
tree.remove(Harvestable);
```

## Action Bundle Pattern

All state mutations that cross multiple traits or require validation are encapsulated in `src/game/rc-actions.ts`, which uses Koota's `createActions` pattern:

```typescript
// src/game/rc-actions.ts
import { createActions } from "koota";

const gameActions = createActions((world) => ({
  addResource: (type: ResourceType, amount: number) => {
    world.set(Resources, (prev) => ({ ...prev, [type]: prev[type] + amount }));
    world.set(LifetimeResources, (prev) => ({ ...prev, [type]: prev[type] + amount }));
  },

  discoverZone: (zoneId: string): boolean => {
    const meta = world.get(WorldMeta);
    if (!meta || meta.discoveredZones.includes(zoneId)) return false;
    world.set(WorldMeta, { ...meta, discoveredZones: [...meta.discoveredZones, zoneId] });
    return true;
  },

  hydrateFromDb: (dbState: HydratedGameState) => {
    // Delegates to focused helper functions (hydrateScreen, hydrateDifficulty, ...)
  },
}));

export const actions = () => gameActions(koota);
```

Callers import `actions()` and call methods directly: `actions().addResource("timber", 5)`.

## Persistence

State persists via `drizzle-orm` + `@capacitor-community/sqlite` (sql.js on web):

```typescript
// On app boot — hydrate Koota from DB
const saved = await loadGameState(db);
actions().hydrateFromDb(saved);

// Auto-save on visibility change
document.addEventListener("visibilitychange", () => {
  if (document.hidden) persistGameState(db, koota);
});
```

`hydrateFromDb` validates select fields before writing — `screen` is checked against the allowed screen union, `difficulty` is validated via `getDifficultyById`, and `currentSeason` is validated via an `isValidSeason` type guard. Other fields are merged directly from DB state.

## Species Codex Pattern

Species tracking uses a domain-event pattern: functions return `CodexEvent | null` instead of triggering UI directly:

```typescript
// src/systems/speciesTracking.ts
export function trackSpeciesPlanting(world: World, speciesId: string): CodexEvent | null {
  // mutates SpeciesProgressTrait
  // returns CodexEvent if tier advanced, null otherwise
}

// Caller is responsible for UI notification
const event = trackSpeciesPlanting(koota, "white-oak");
if (event) showToast(`${event.speciesName}: ${event.tierName}`, "success");
```

## Common Traits Reference

| Trait | Scope | Key Fields |
|-------|-------|------------|
| `PlayerProgress` | World | `coins`, `xp`, `level`, `unlockedTools`, `unlockedSpecies` |
| `Resources` | World | `timber`, `sap`, `fruit`, `acorns` |
| `Tracking` | World | `treesPlanted`, `treesHarvested`, `treesWatered`, ... |
| `Settings` | World | `soundEnabled`, `hapticsEnabled`, `hasSeenRules` |
| `WorldMeta` | World | `worldSeed`, `currentZoneId`, `discoveredZones` |
| `Difficulty` | World | `id`, `permadeath` |
| `CurrentSeason` | World | `value: "spring" \| "summer" \| "autumn" \| "winter"` |
| `SpeciesProgressTrait` | World | `speciesProgress`, `pendingCodexUnlocks` |
| `FarmerState` | Entity | `stamina`, `maxStamina`, `hp`, `maxHp` |
| `Position` | Entity | `x`, `y`, `z` |
| `Tree` | Entity | `speciesId`, `stage`, `progress`, `watered` |
| `Npc` | Entity | `dialogueState` |
