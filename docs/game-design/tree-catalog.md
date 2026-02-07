# Tree Catalog

Grovekeeper has 15 tree species: 12 base species available through normal leveling, and 3 prestige species unlocked via the prestige system.

## Growth Model

All trees progress through 5 stages (indexed 0--4):

| Stage | Name | Scale | Description |
|-------|------|-------|-------------|
| 0 | Seed | 0.08 | Tiny visible seed on the ground |
| 1 | Sprout | 0.15 | Small shoot emerging |
| 2 | Sapling | 0.40 | Small trunk with initial canopy |
| 3 | Mature | 0.80 | Full trunk with 2--3 canopy clusters |
| 4 | Old Growth | 1.20 | Thick trunk with 3+ canopy clusters |

Each species defines `baseGrowthTimes` as a 5-element array. Each value is the number of seconds required to complete that stage under neutral conditions (summer, difficulty 1, no water bonus).

Visual scale interpolates smoothly between stages using a lerp-based partial preview: `scale = baseScale + (nextScale - baseScale) * progress * 0.3`.

## Base Species

Defined in `src/game/constants/trees.ts` as `TREE_SPECIES`:

| Species | ID | Diff | Unlock | Biome | Base Growth (s) | Harvest Cycle | Yield |
|---------|-----|------|--------|-------|-----------------|---------------|-------|
| White Oak | `white-oak` | 1 | Lv 1 | Temperate | 10, 15, 20, 25, 30 | 45s | 2 Timber |
| Weeping Willow | `weeping-willow` | 2 | Lv 2 | Wetland | 12, 18, 24, 30, 36 | 60s | 3 Sap |
| Elder Pine | `elder-pine` | 2 | Lv 3 | Mountain | 12, 16, 22, 28, 35 | 50s | 2 Timber + 1 Sap |
| Cherry Blossom | `cherry-blossom` | 3 | Lv 5 | Temperate | 15, 22, 30, 38, 45 | 75s | 2 Fruit |
| Ghost Birch | `ghost-birch` | 3 | Lv 6 | Tundra Edge | 14, 20, 28, 36, 42 | 55s | 2 Sap + 1 Acorn |
| Redwood | `redwood` | 4 | Lv 8 | Coastal | 20, 30, 45, 60, 75 | 120s | 5 Timber |
| Flame Maple | `flame-maple` | 4 | Lv 10 | Highland | 18, 26, 36, 48, 58 | 90s | 3 Fruit |
| Baobab | `baobab` | 5 | Lv 12 | Savanna | 25, 35, 50, 65, 80 | 150s | 2 Timber + 2 Sap + 2 Fruit |

### Species Specials

- **White Oak** -- Starter tree. No seed cost. Reliable baseline yields.
- **Weeping Willow** -- +30% yield when planted near water tiles. Drooping canopy mesh with elongated strands.
- **Elder Pine** -- Evergreen: grows at 30% rate in winter (most trees halt). Conical canopy shape.
- **Cherry Blossom** -- Beauty Aura: +10% XP for all actions within 1 tile radius. Pink canopy; falling petal CSS overlay at stage 3+.
- **Ghost Birch** -- 50% growth rate in winter (better than standard evergreen). Night glow effect using a dedicated night-variant template mesh cache.
- **Redwood** -- Tallest species (trunk height 3.0). Old Growth bonus: +1 Acorn per harvest cycle at stage 4.
- **Flame Maple** -- Beauty Aura with 2-tile radius. 2x yield during Autumn. Orange canopy.
- **Baobab** -- Drought-resistant (unaffected by drought weather penalty). Yields all three primary resources. Wide tapering trunk (radius 0.3). 2-tile footprint.

## Prestige Species

Defined in `src/game/constants/trees.ts` as `PRESTIGE_TREE_SPECIES`. All require level 25 and are gated behind prestige count:

| Species | ID | Diff | Prestige Req | Base Growth (s) | Harvest Cycle | Yield | Special |
|---------|-----|------|-------------|-----------------|---------------|-------|---------|
| Crystalline Oak | `crystal-oak` | 5 | 1st prestige | 20, 30, 45, 60, 80 | 100s | 5 Acorns | Prismatic glow; seasonal tint shifts |
| Moonwood Ash | `moonwood-ash` | 4 | 2nd prestige | 18, 28, 40, 55, 70 | 90s | 3 Sap + 2 Acorns | Grows only at night; silver shimmer |
| Worldtree | `worldtree` | 5 | 3rd prestige | 30, 45, 65, 90, 120 | 180s | 4T + 3S + 3Fr + 3A | 2x2 footprint; boosts entire grove |

### Prestige Mesh Details

- **Crystalline Oak** -- Evergreen; trunk color `#B0BEC5` (pale silver), canopy `#80CBC4` (teal). Prismatic seasonal tint applied as a material color shift each season.
- **Moonwood Ash** -- Trunk `#CFD8DC`, canopy `#B39DDB` (lavender). Silver shimmer at night.
- **Worldtree** -- Largest species (trunk height 3.5, canopy radius 1.5, 12 canopy segments). Evergreen; deep green canopy.

## Mesh System

Each species defines `meshParams` controlling procedural mesh generation:

```typescript
meshParams: {
  trunkHeight: number;    // Height of the cylinder trunk
  trunkRadius: number;    // Radius of the trunk
  canopyRadius: number;   // Radius of the canopy sphere/cluster
  canopySegments: number; // Number of canopy sub-meshes (detail level)
  color: {
    trunk: string;        // Hex color for bark
    canopy: string;       // Hex color for leaves
  };
}
```

The `treeMeshBuilder.ts` module generates species-specific PBR meshes using the BabylonJS SPS (Solid Particle System) Tree Generator, ported from the BabylonJS Extensions repository into `spsTreeGenerator.ts`. Meshes use seeded RNG (`meshSeed` stored per tree entity) for deterministic procedural variation.

### Template Caching

Template meshes are cached by key `${speciesId}_${season}` (and `${speciesId}_${season}_night` for Ghost Birch). New tree instances use `Mesh.clone()` from the cached template. Stage 4 (Old Growth) trees have their world matrices frozen via `mesh.freezeWorldMatrix()` for rendering performance.

## Seed Costs

| Species | Cost |
|---------|------|
| White Oak | Free (10 seeds at game start) |
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

## Source Files

| File | Role |
|------|------|
| `src/game/constants/trees.ts` | `TREE_SPECIES`, `PRESTIGE_TREE_SPECIES`, `getSpeciesById()` |
| `src/game/utils/treeMeshBuilder.ts` | Species-specific PBR mesh generation |
| `src/game/utils/spsTreeGenerator.ts` | Ported SPS Tree Generator (seeded RNG) |
| `src/game/constants/config.ts` | `STAGE_VISUALS`, `MAX_STAGE`, `DIFFICULTY_MULTIPLIERS` |
