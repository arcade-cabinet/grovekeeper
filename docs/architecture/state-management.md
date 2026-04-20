---
title: State Management
updated: 2026-04-20
status: current
domain: technical
---

# State Management

Grovekeeper uses **Koota** as its single unified state management system. Koota is both the ECS (Entity-Component-System) and the persistent state store. All game state — runtime entity data and player progress — lives in Koota traits.

## Historical Context

Pre-1.0, state was split: Zustand handled persistent player data (XP, level, resources), and Miniplex ECS managed runtime entities (trees, NPCs, effects). This required synchronization between systems. Post-1.0-alpha.1, Koota unifies both: world-level singleton traits replace Zustand, per-entity traits replace Miniplex, and persistence via sql.js replaces localStorage.

## Architecture

**Koota** stores state as traits — each trait is a type signature with methods. Two trait categories:

1. **World-level singleton traits** — Game-wide state (one instance per world)
   - `PlayerProgress` — XP, level, prestige count
   - `Resources` — Timber, Sap, Fruit, Acorns balances
   - `Quests` — Active quests, completed quest IDs
   - `Settings` — Tutorial flag, haptics, sound toggles
   - `Achievements` — Unlocked achievement IDs
   - `Difficulty` — Game difficulty level
   - `Tutorial` — Tutorial step + completion state

2. **Per-entity traits** — Runtime game objects
   - `Position` — (x, y, z) coordinates
   - `Tree` — Species, growth stage, water level
   - `Npc` — Dialogue state, inventory
   - `Renderable` — Mesh reference + visibility
   - `Harvestable` — Harvestable type + yield
   - `IsPlayer` — Marks the player entity

## Reading State in Components

Use the **Solid adapter** at `src/ecs/solid.ts` to read traits in SolidJS components:

```typescript
import { useTrait, useQuery, useQueryFirst, useHas } from "@/ecs/solid";

// Read a world-level trait
const resources = useTrait(koota, Resources);
// Returns: () => Resources (Solid signal accessor)
// Use: <div>{resources().timber}</div>

// Query all trees with position and renderable
const allTrees = useQuery(Tree, Position, Renderable);
// Returns: () => Entity[] (Solid signal)
// Use: {allTrees().map(tree => ...)}

// Get first NPC (or undefined)
const firstNpc = useQueryFirst(Npc, Position);
// Returns: () => Entity | undefined

// Check if entity has a trait
const isHarvestable = useHas(tree, Harvestable);
// Returns: boolean
```

All hooks return **Solid signals** (functions) that reactively track changes. Components re-run when signals change.

## Trait Update Patterns

All state mutations go through Koota's `set()` and `add()`/`remove()` APIs:

```typescript
// Full overwrite (world-level trait)
koota.set(PlayerProgress, { xp: 500, level: 5, prestigeCount: 0 });

// Functional update
koota.set(Resources, (prev) => ({
  ...prev,
  timber: prev.timber + 10,
}));

// Per-entity update
const tree = world.getBy(Position, { x: 0, y: 0, z: 0 });
tree.set(Tree, { stage: "mature", water: 100 });

// Add a trait to an entity
tree.add(Harvestable("apple"));

// Remove a trait
tree.remove(Harvestable);
```

## Action Bundle Pattern

All state mutations are encapsulated in `src/actions.ts`, which exports ~63 named actions. This provides a single API surface and closure-captured world context:

```typescript
// src/actions.ts
export function createActions(world: Koota) {
  return {
    addXp: (amount: number) => {
      const current = world.get(PlayerProgress);
      const newLevel = calculateLevel(current.xp + amount);
      world.set(PlayerProgress, {
        ...current,
        xp: current.xp + amount,
        level: newLevel,
      });
      if (newLevel > current.level) {
        queueMicrotask(() => showToast(`Level ${newLevel}!`));
      }
    },
    
    harvestTree: (tree: Entity) => {
      const treeData = tree.get(Tree);
      const yields = calculateYield(treeData);
      const resources = world.get(Resources);
      world.set(Resources, { ...resources, ...yields });
      tree.remove(Harvestable);
    },
  };
}
```

UI and systems import and call actions: `actions.addXp(50)`.

## Persistence

State persists to SQL via `src/db.ts`:

```typescript
// On app boot
const saved = await hydrateFromDb();
world.set(PlayerProgress, saved.playerProgress);
world.set(Resources, saved.resources);
// ... all singleton traits

// Auto-save on visibility change
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) {
    await persistToDb(world);
  }
});
```

Serialization uses sql.js (in-memory SQLite). All traits are tagged with `@persistent` to mark what to serialize.

## Timing: Subscriptions and Reactivity

Koota fires `removeSubscriptions` **before** clearing the trait mask. The Solid adapter defers all signal refreshes to the next microtask, ensuring subscribers observe post-mutation state:

```typescript
// Safe pattern (inside an action)
koota.set(Resources, newResources); // subscribers notified
// Solid components re-evaluate with updated value in next microtask
```

## Common Traits

| Trait | Scope | Fields |
|-------|-------|--------|
| `PlayerProgress` | World | `xp`, `level`, `prestigeCount` |
| `Resources` | World | `timber`, `sap`, `fruit`, `acorns` |
| `Quests` | World | `active: Quest[]`, `completed: string[]` |
| `Settings` | World | `soundEnabled`, `hapticsEnabled` |
| `Achievements` | World | `unlockedIds: string[]` |
| `Position` | Entity | `x`, `y`, `z` |
| `Tree` | Entity | `species`, `stage`, `water` |
| `Npc` | Entity | `dialogueState`, `inventory` |
| `Renderable` | Entity | `meshRef?: Mesh`, `visible: boolean` |
