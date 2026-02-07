# Economy

Grovekeeper uses a four-resource economy with coins as a secondary currency. Resources are earned by harvesting trees and spent on seeds and grid expansion.

## Resource Types

Defined in `src/game/constants/resources.ts`:

| Resource | ID | Icon | Primary Source |
|----------|----|------|----------------|
| Timber | `timber` | Tree | Oak, Pine, Redwood, Baobab |
| Sap | `sap` | Droplet | Willow, Pine, Ghost Birch, Baobab |
| Fruit | `fruit` | Apple | Cherry Blossom, Flame Maple, Baobab |
| Acorns | `acorns` | Nut | Ghost Birch, Crystalline Oak, Moonwood Ash |

Resources are tracked as integers in the Zustand store under `resources: Record<ResourceType, number>`. Lifetime totals are separately tracked in `lifetimeResources` for achievement triggers.

## Resource Flow

```
   HARVEST mature/old-growth trees
            |
            v
   +-- Resources added (species-specific yields)
   +-- Coins added (flat amount per harvest)
   +-- XP added
   +-- Floating particles show "+2 Timber", etc.
            |
            v
   SPEND on:
     +-- Seeds (per-species resource costs)
     +-- Grid expansion (tiered resource + level requirements)
```

## Harvest Yields by Species

Each species defines its yield in the `yield` array of `TreeSpeciesData`:

| Species | Yield per Harvest |
|---------|-------------------|
| White Oak | 2 Timber |
| Weeping Willow | 3 Sap |
| Elder Pine | 2 Timber + 1 Sap |
| Cherry Blossom | 2 Fruit |
| Ghost Birch | 2 Sap + 1 Acorn |
| Redwood | 5 Timber (+1 Acorn at Old Growth) |
| Flame Maple | 3 Fruit (x2 in Autumn) |
| Baobab | 2 Timber + 2 Sap + 2 Fruit |
| Crystalline Oak | 5 Acorns |
| Moonwood Ash | 3 Sap + 2 Acorns |
| Worldtree | 4 Timber + 3 Sap + 3 Fruit + 3 Acorns |

Harvest yields are modified by:

- **Prestige harvest bonus:** multiplicative (1.05x at prestige 1, up to 1.20x at prestige 3; `Math.ceil` applied to fractional yields).
- **Pruning Shears:** bonus multiplier on next harvest when tool is used.
- **Flame Maple Autumn bonus:** 2x yields during the Autumn season.
- **Willow water bonus:** +30% yield when planted adjacent to water tiles.

## Seed Costs

Seeds are purchased using resources. Costs are defined per species in the `seedCost` field of `TreeSpeciesData`:

| Species | Seed Cost |
|---------|-----------|
| White Oak | Free (player starts with 10 seeds) |
| Weeping Willow | 5 Sap |
| Elder Pine | 5 Timber |
| Cherry Blossom | 8 Fruit |
| Ghost Birch | 6 Sap + 2 Acorns |
| Redwood | 15 Timber |
| Flame Maple | 12 Fruit |
| Baobab | 10 Timber + 10 Sap + 10 Fruit |
| Crystalline Oak | 20 Acorns |
| Moonwood Ash | 15 Sap + 10 Acorns |
| Worldtree | 20 Timber + 20 Sap + 20 Fruit + 20 Acorns |

Seeds are stored per-species in `seeds: Record<string, number>` in the Zustand store. The `spendSeed()` action checks availability and returns `false` if insufficient.

## Grid Expansion Costs

Expanding the grove requires both a minimum level and resource payment:

| Expansion | Size | Level | Cost |
|-----------|------|-------|------|
| Tier 1 | 12 -> 16 | 5 | 100 Timber + 50 Sap |
| Tier 2 | 16 -> 20 | 10 | 250 Timber + 100 Sap + 50 Fruit |
| Tier 3 | 20 -> 24 | 15 | 500 Timber + 250 Sap + 100 Fruit + 50 Acorns |
| Tier 4 | 24 -> 32 | 20 | 1,000 Timber + 500 Sap + 250 Fruit + 100 Acorns |

## Coins

Coins are a secondary currency earned from harvesting. The player starts with 100 coins. Coins are tracked separately from the four primary resources and do not currently have a major spending sink beyond acting as a legacy currency from earlier development phases. Grid expansion uses resources, not coins.

## Economy Balance

The economy is designed to feel generous rather than punishing:

- White Oak seeds are free, so the player can always plant something.
- Early species (Willow, Pine) cost only 5 of a single resource.
- Baobab is the most expensive base species but also yields all three primary resources, making it self-sustaining after initial investment.
- Prestige species are the most expensive, requiring 15--20 units of their primary resources.
- Grid expansion costs escalate to provide long-term goals.

## Store Actions

```typescript
addResource(type: ResourceType, amount: number)  // Adds to both current and lifetime
spendResource(type: ResourceType, amount: number) // Returns false if insufficient
addSeed(speciesId: string, amount: number)
spendSeed(speciesId: string, amount: number)      // Returns false if insufficient
addCoins(amount: number)
```

The `addResource()` action increments both `resources[type]` and `lifetimeResources[type]` in a single state update. Lifetime tracking is never decremented, enabling cumulative achievement checks.

## Source Files

| File | Role |
|------|------|
| `src/game/constants/resources.ts` | `ResourceType`, `RESOURCE_INFO`, `emptyResources()` |
| `src/game/constants/trees.ts` | Per-species `yield` and `seedCost` definitions |
| `src/game/stores/gameStore.ts` | Resource state, spend/add actions, seed inventory |
| `src/game/systems/gridExpansion.ts` | Expansion tier costs and affordability checks |
| `src/game/ui/ResourceBar.tsx` | HUD resource display |
| `src/game/ui/FloatingParticles.tsx` | "+2 Timber" floating text on harvest |
