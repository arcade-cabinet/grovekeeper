---
title: ECS Patterns
updated: 2026-04-20
status: current
domain: technical
---

# ECS Patterns

Grovekeeper uses [Koota 0.6](https://github.com/eliaspekkari/koota) as both the Entity-Component-System framework and the persistent state store. Koota manages all game state — entities (trees, players, NPCs) with traits (components) at runtime, and world-level singleton traits (player progression, time, resources) across sessions.

## Core Concepts

**World**: A Koota world is a container for entities and singleton traits. The world itself is entity ID 0; all user-spawned entities have IDs >= 1.

**Traits**: Immutable schemas that define the shape of component data. A trait is created with `trait({ ...schema })` and instantiated by calling it as a function: `Tree({ speciesId: "white-oak", stage: 0 })`.

**Entities**: Objects that hold zero or more trait instances. Each entity is identified by a unique ID and can be queried by the traits it possesses.

## Defining Traits

Traits are defined centrally in `src/traits.ts`. Use `trait()` from the koota package:

```typescript
import { trait } from "koota";

// Scalar trait — no mutable references in the default value
export const Position = trait({ x: 0, y: 0, z: 0 });

// Entity trait — describes trees
export const Tree = trait({
  speciesId: "white-oak",
  stage: 0 as 0 | 1 | 2 | 3 | 4,  // Seed, Sprout, Sapling, Mature, Old Growth
  progress: 0,
  watered: false,
  totalGrowthTime: 0,
  plantedAt: 0,
  meshSeed: 0,
});
```

### Factory Defaults for Mutable Types

When a trait's default value is a mutable reference (array, record), use a factory function to avoid shared state:

```typescript
// ✓ Correct: factory prevents shared reference
export const Achievements = trait({ items: () => [] as string[] });
export const Harvestable = trait({
  resources: () => [] as { type: string; amount: number }[],
  cooldownElapsed: 0,
  ready: false,
});

// ✗ Wrong: shared array across all trait instances
export const BadTrait = trait({ items: [] as string[] });
```

**Important gotcha**: A factory-only trait `trait(() => [...])` resolves to `Trait<{}>`. Always wrap in an object schema: `trait({ items: () => [...] })`.

## Creating the World

The world is instantiated in `src/koota.ts` with all world-level singleton traits registered:

```typescript
export const koota = createWorld(
  Time,
  CurrentSeason,
  PlayerProgress,
  Resources,
  Achievements,
  // ... more singleton traits
);
```

Singleton traits are set on the world itself (entity 0) during world creation. Access them globally via `koota.get(Trait)` / `koota.set(Trait, ...)`.

## Spawning Entities

Create entities with `koota.spawn()`, passing trait instances:

```typescript
const tree = koota.spawn(
  Tree({ speciesId: "white-oak", stage: 0 }),
  Position({ x: 5, y: 0, z: 7 }),
  Renderable({ meshId: null, visible: true, scale: 0 })
);
```

The spawn helper in `src/koota.ts` provides convenient factories for common entity types:

```typescript
export function spawnPlayer(): ReturnType<typeof koota.spawn> {
  return koota.spawn(
    IsPlayer,
    Position({ x: 6, y: 0, z: 6 }),
    FarmerState({ stamina: 100, maxStamina: 100 }),
    Renderable({ visible: true, scale: 1 })
  );
}
```

## Querying Entities

Iterate over entities matching a set of traits using `koota.query()`:

```typescript
for (const e of koota.query(Tree, Position, Renderable)) {
  const pos = e.get(Position);
  const tree = e.get(Tree);
  const render = e.get(Renderable);
  // Process tree growth, update visuals, etc.
}
```

Query is synchronous and returns a `QueryResult` — an iterable collection.

## Mutating Traits

### Setting Trait Data

Replace some or all fields of a trait instance on an entity:

```typescript
// Overwrite partial fields
e.set(Tree, { stage: 1, progress: 0 });

// Or use a functional update
e.set(Tree, prev => ({ ...prev, stage: prev.stage + 1 }));
```

### Adding and Removing Traits

```typescript
// Add a trait (must not already exist)
e.add(Renderable({ meshId: "mesh_123", visible: true, scale: 1 }));

// Remove a trait by reference
e.remove(Renderable);

// Check if entity has a trait
if (e.has(Tree)) { /* ... */ }
```

### Destroying Entities

```typescript
e.destroy();
```

**Critical gotcha**: The world itself is entity 0, which holds all singleton traits. Calling `e.destroy()` on the world nukes singleton state. Use the helper `destroyAllEntitiesExceptWorld()` from `src/koota.ts` in test cleanup:

```typescript
beforeEach(() => {
  destroyAllEntitiesExceptWorld();
  // Now safe to spawn test entities
});
```

## World-Level Singletons

Singleton traits live on the world entity (ID 0) and are set during `createWorld()`. Access them without entity context:

```typescript
// Read
const time = koota.get(Time);
const progress = koota.get(PlayerProgress);

// Write
koota.set(Time, { gameTimeMicroseconds: 86400000 });
koota.set(PlayerProgress, prev => ({
  ...prev,
  level: prev.level + 1,
}));
```

## Reactivity and Subscriptions

Koota provides subscription APIs for trait changes:

```typescript
// Fire when an entity gains a trait
const unsub = koota.onAdd(Tree, (e) => console.log("Tree planted:", e.id()));

// Fire when an entity loses a trait (called BEFORE the trait is removed)
koota.onRemove(Tree, (e) => console.log("Tree removed:", e.id()));

// Fire when a trait's data changes
koota.onChange(Tree, (e) => console.log("Tree updated:", e.get(Tree)));

// Fire when an entity enters/exits a query result
koota.onQueryAdd([Tree, Position], (e) => console.log("Tree can grow"));
koota.onQueryRemove([Tree, Position], (e) => console.log("Tree can't grow"));

// Call unsub() to clean up the listener
unsub();
```

**Note on onRemove**: The listener fires BEFORE the trait is removed from the mask. If you need to read the trait value, do it synchronously. If you need to defer, use `queueMicrotask()`.

## Systems

Systems are pure functions that run every frame. They iterate over entity queries and mutate trait data:

```typescript
export function growthSystem(
  world: typeof koota,
  dt: number,
  season: Season,
  weatherMult: number
): void {
  for (const e of world.query(Tree, Position)) {
    const tree = e.get(Tree);
    const growth = computeGrowth(tree, season, weatherMult);
    e.set(Tree, { progress: tree.progress + growth * dt });

    // Advance to next stage?
    if (e.get(Tree).progress >= 1) {
      e.set(Tree, { stage: tree.stage + 1, progress: 0 });
    }
  }
}
```

Systems must:
- **Not create/destroy entities** — entity lifecycle is managed by the game loop
- **Not import persistence stores directly** — take context as parameters
- **Be deterministic** — same inputs always produce same outputs
- **Run in order** — the game loop controls execution sequence

## Solid.js Integration

Solid components subscribe to entity queries via the `useQuery` hook from `src/ecs/solid.ts`:

```typescript
import { useQuery } from "@/ecs/solid";
import { Tree, Position, Renderable } from "@/traits";

export function TreeRenderer() {
  const trees = useQuery(Tree, Position, Renderable);

  return (
    <For each={trees()}>
      {(e) => (
        <TreeMesh
          species={e.get(Tree).speciesId}
          pos={e.get(Position)}
        />
      )}
    </For>
  );
}
```

The hook subscribes to `onQueryAdd` and `onQueryRemove` internally, updating the signal on trait changes. Cleanup is automatic via `onCleanup()`.

## Trait Catalog

All traits are centralized in `src/traits.ts` for discoverability. Categories include:

- **Spatial**: `Position`, `Renderable`, `MeshRef`
- **Trees**: `Tree`, `Harvestable`, `Wild`, `Pruned`
- **Grid**: `GridCell`, `Zone`, `Prop`
- **Actors**: `IsPlayer`, `FarmerState`, `Npc`
- **World**: `Time`, `CurrentSeason`, `PlayerProgress`, `Resources`, `Achievements`, etc.

Link to [`src/traits.ts`](../../../src/traits.ts) for the complete catalog.

## Serialization

Persistence is handled by individual systems, not by Koota itself. For example, `src/systems/saveLoad.ts` reads entity data and stores it in persistent state (Legend State, localStorage, or IndexedDB as configured).

The game loop periodically calls save systems to serialize relevant entities:

```typescript
// Pseudo-code in the game loop
const saveData = {
  trees: koota.query(Tree, Position).map(e => ({
    ...e.get(Tree),
    ...e.get(Position),
  })),
  player: koota.query(IsPlayer, FarmerState).map(e => ({
    ...e.get(FarmerState),
    ...e.get(Position),
  })),
};
await savePersistentState(saveData);
```

On load, spawned entities are recreated from saved data.

## Historical Note

Prior to Koota, Grovekeeper used Miniplex 2.x. Miniplex was a query-only ECS; state persistence required a separate store. Koota consolidates both roles in a single system, simplifying the architecture and reducing context switching between entity data and player progression.

## See Also

- [`src/koota.ts`](../../../src/koota.ts) — World instantiation and spawn helpers
- [`src/traits.ts`](../../../src/traits.ts) — Trait definitions
- [`src/ecs/solid.ts`](../../../src/ecs/solid.ts) — Solid.js integration hooks
- [`src/actions.ts`](../../../src/actions.ts) — ~63 action mutators
- [`src/systems/`](../../../src/systems/) — System implementations
- [state-management.md](./state-management.md) — Persistence and player progression
