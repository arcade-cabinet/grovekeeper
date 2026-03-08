# Tree Species & Growth Visual System -- Production Spec

> **Partially superseded by:** [`docs/plans/2026-03-07-unified-game-design.md`](../plans/2026-03-07-unified-game-design.md) Section 5 (Tree Species & Growth) and Section 2 (The Procedural/Model Balance)
>
> **Key changes from this document:**
> - **GLB-based, not SPS procedural.** Trees now use stylized GLB models (8 nature trees + 72 tree_pack_1.1 models). The SPS Tree Generator (`spsTreeGenerator.ts`) and procedural mesh generation (`treeMeshBuilder.ts`) are replaced by ~50 lines of GLB loading + InstancedMesh. This eliminates the 951-line SPS generator and all per-species `meshParams`.
> - **Growth = scale on GLB model:** Seed (0.1x), Sprout (0.25x), Sapling (0.5x), Mature (1.0x), Old Growth (1.3x). Stages 0-1 still use tiny hardcoded geometry (cone+sphere for seed, cylinder+triangles for sprout).
> - **Seasons = color tint OR winter GLB swap.** 6 winter variant GLBs available. No per-season mesh rebuilds.
> - **Camera is first-person, not diorama.** "Recognizable at a glance from the fixed diorama camera" no longer applies.
> - **Bright Zelda-style aesthetic** is the visual pillar -- MSAA, smooth shading, PBR materials, device-native pixel ratio.
> - **Instanced rendering via InstancedMesh** -- template key `${speciesId}_${stage}_${season}[_night]`, start capacity 20, double on overflow. This section's R3F architecture is largely valid.
>
> This document retains **extensive unique detail** about per-species visual parameters (trunk colors, canopy colors, seasonal palettes), growth animation curves, prestige species special effects, vertex budget analysis, and config JSON schemas. These details supplement the unified doc and remain valuable for implementation reference, but mesh generation specifics (SPS params, canopySegments, trunk dimensions) should be reinterpreted as GLB model selection criteria rather than procedural generation inputs.

Version 1.0 -- Grovekeeper

This document specifies the complete visual identity of every tree species across all growth stages, seasons, and special conditions. It is the authoritative reference for procedural mesh generation, growth animation, seasonal color shifts, prestige effects, and instanced rendering.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Growth Stage Model](#2-growth-stage-model)
3. [Per-Species Visual Catalog](#3-per-species-visual-catalog)
4. [Seasonal Canopy Color Tables](#4-seasonal-canopy-color-tables)
5. [Growth Animation System](#5-growth-animation-system)
6. [Prestige Species Special Effects](#6-prestige-species-special-effects)
7. [Instanced Rendering Strategy](#7-instanced-rendering-strategy)
8. [Vertex Budget Analysis](#8-vertex-budget-analysis)
9. [Config JSON Schema](#9-config-json-schema)
10. [R3F Component Architecture](#10-r3f-component-architecture)
11. [Implementation Notes](#11-implementation-notes)

---

## 1. Design Philosophy

### Visual Pillars

- **Cozy low-poly.** Trees are recognizable at a glance from the fixed diorama camera. Silhouette matters more than detail. Trunk shape, canopy outline, and color are the three axes of species differentiation.
- **Growth is the reward.** The visual jump between stages must feel earned. Stage transitions are the game's primary dopamine loop. Each stage should look meaningfully different, not just bigger.
- **Seasonal magic.** Canopy colors shift with the season wheel. Deciduous trees lose their leaves in winter (canopy alpha drops, bare branches show). Evergreens darken and persist.
- **Stylized Zelda aesthetic.** Low segment counts on cylinders (6--12 sides) for whimsy. Icosahedron-based canopy spheres at detail level 1. PBR materials with smooth shading.

### Coordinate Conventions

All dimensions in this document are in **world units** at the species' canonical scale (`meshParams` values). The growth system applies a stage-dependent uniform scale multiplier on top:

| Stage | Scale Factor | Effective Height (White Oak, trunk 1.8) |
|-------|-------------|----------------------------------------|
| 0 (Seed) | 0.08 | 0.144 |
| 1 (Sprout) | 0.15 | 0.270 |
| 2 (Sapling) | 0.40 | 0.720 |
| 3 (Mature) | 0.80 | 1.440 |
| 4 (Old Growth) | 1.20 | 2.160 |

The `getStageScale()` function additionally lerps up to 30% toward the next stage based on within-stage progress, creating a continuous growth feel.

---

## 2. Growth Stage Model

### Stage Definitions

Each stage has distinct geometry complexity, not just a scale change. The SPS profile parameters shift per stage to add visual richness as the tree grows.

#### Stage 0 -- Seed

- **Geometry:** A small mound of earth (flattened sphere, 6 segments, squashed to 40% Y) with a tiny seed nub on top (4-segment cylinder, height 0.05).
- **No trunk, no canopy.** The SPS tree generator is NOT invoked at stage 0. A simple hardcoded geometry is used instead.
- **Color:** Earth brown `hsl(15, 30%, 28%)` for the mound. Seed nub uses the species' trunk color at 70% lightness.
- **Vertex budget:** 40--60 vertices.

#### Stage 1 -- Sprout

- **Geometry:** A thin stem (6-segment cylinder, height = `trunkHeight * 0.3`, radius = `trunkRadius * 0.4`) with 2--3 leaf discs (CircleGeometry, 6 segments each) attached at the tip.
- **The SPS tree generator is NOT invoked at stage 1.** Like stage 0, this uses a purpose-built sprout geometry function.
- **Leaves:** 2 leaf discs for most species, 3 for species with `canopySegments >= 10`. Each disc is `canopyRadius * 0.15` radius.
- **Color:** Stem uses species trunk color. Leaves use the current seasonal canopy color at +15% lightness (young growth is brighter).
- **Vertex budget:** 60--100 vertices.

#### Stage 2 -- Sapling

- **Geometry:** The SPS tree generator IS invoked, but with a reduced profile:
  - `boughs: 1` (no second-level branching regardless of species profile)
  - `forks: min(speciesForks, 2)` (capped at 2 forks)
  - `branches: max(2, floor(speciesBranches * 0.3))` (30% of mature branch count, min 2)
  - `leavesOnBranch: max(2, floor(speciesLeaves * 0.5))` (50% leaf density)
- **The tree is recognizable as its species** at this stage. Canopy shape, trunk proportions, and color are all in place, just sparse.
- **Vertex budget:** 200--500 vertices.

#### Stage 3 -- Mature

- **Geometry:** Full SPS tree generator invoked with the species' complete profile from `SPECIES_SPS`.
- **All branches, leaves, and crown mini-trees** are present. This is the "complete" tree form.
- **Harvestable trees** at this stage may display a subtle visual indicator (a warm glow rim or small fruit/sap meshes -- see Section 11).
- **Vertex budget:** 500--1200 vertices.

#### Stage 4 -- Old Growth

- **Geometry:** SPS tree generator invoked with an ENHANCED profile:
  - `trunkHeight: speciesTrunkHeight * 1.15` (15% taller trunk)
  - `trunkRadius` effectively larger due to the 1.2x overall scale
  - `branches: speciesBranches + 4` (4 extra crown mini-trees)
  - `leavesOnBranch: speciesLeaves + 2` (denser foliage)
  - `bowHeight: speciesBowHeight * 1.3` (gnarlier, more characterful bowing)
- **Visual distinction from stage 3** comes from the gnarled, heavier silhouette and increased foliage density. The tree looks ancient, thick, and established.
- **World matrix is frozen** after initial placement (`matrixAutoUpdate = false`). Growth animation ceases at stage 4.
- **Vertex budget:** 800--1600 vertices.

### Stage Complexity Summary

| Stage | SPS Used? | Forks | Boughs | Branches | Leaves/Branch | Max Verts |
|-------|-----------|-------|--------|----------|--------------|-----------|
| 0 | No | -- | -- | -- | -- | 60 |
| 1 | No | -- | -- | -- | 2--3 discs | 100 |
| 2 | Yes (reduced) | min(spec, 2) | 1 | 30% of spec | 50% of spec | 500 |
| 3 | Yes (full) | spec | spec | spec | spec | 1200 |
| 4 | Yes (enhanced) | spec | spec | spec+4 | spec+2 | 1600 |

---

## 3. Per-Species Visual Catalog

### 3.1 White Oak (`white-oak`)

**Silhouette archetype:** Classic rounded deciduous tree. Broad, symmetrical crown. The "default" tree shape all others are compared against.

| Property | Value |
|----------|-------|
| Trunk height | 1.8 |
| Trunk radius | 0.15 |
| Trunk taper | 0.6 |
| Trunk color (hex / HSL) | `#5D4037` / hsl(16, 18%, 29%) |
| Canopy radius | 0.9 |
| Canopy segments | 8 |
| Canopy shape | Rounded (3 forks, 2 boughs, broad crown) |
| Canopy base color | `#388E3C` / hsl(122, 41%, 39%) |
| Forks / Boughs | 3 / 2 |
| Fork angle | 1.0 rad |
| Fork ratio | 0.7 |
| Branch count | 8 |
| Leaves per branch | 5 |
| Bow height | 2.0 |
| Unique trait | None -- baseline species. Reliable, symmetrical. |
| Deciduous? | Yes |
| Evergreen? | No |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Small brown earth mound with a dark brown acorn-shaped seed nub |
| 1 | Thin brown stem (height 0.54) with 2 green leaf discs at tip |
| 2 | Recognizable oak silhouette: short trunk, 2 fork branches, sparse rounded canopy |
| 3 | Full broad oak with 3 fork branches, 2 bough levels, 8 crown mini-trees |
| 4 | Thick gnarled trunk, bowHeight 2.6, 12 crown mini-trees, dense rounded canopy |

---

### 3.2 Weeping Willow (`weeping-willow`)

**Silhouette archetype:** Tall narrow trunk exploding into long, drooping branches. The highest `bowHeight` creates the signature cascading effect.

| Property | Value |
|----------|-------|
| Trunk height | 2.0 |
| Trunk radius | 0.12 |
| Trunk taper | 0.6 |
| Trunk color | `#6D4C41` / hsl(16, 25%, 34%) |
| Canopy radius | 1.1 |
| Canopy segments | 10 |
| Canopy shape | Drooping curtain (high fork angle, extreme bow height) |
| Canopy base color | `#66BB6A` / hsl(122, 40%, 57%) |
| Forks / Boughs | 4 / 2 |
| Fork angle | 1.3 rad (wider splay than most) |
| Fork ratio | 0.65 |
| Branch count | 15 (highest of any base species) |
| Leaves per branch | 10 (highest of any base species) |
| Bow height | 5.2 (extreme -- creates the "weeping" cascade) |
| Unique trait | Drooping branches from high bowHeight. Visually the widest canopy spread. |
| Deciduous? | Yes |
| Evergreen? | No |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Earth mound with a small twig seed nub; slightly darker brown than oak |
| 1 | Slim green stem with 3 leaf discs (canopySegments >= 10 rule) |
| 2 | Narrow trunk with 2 drooping branches; bowHeight visible even at reduced scale |
| 3 | Full weeping form: 4 forks, heavily bowed, 15 branch mini-trees cascading down |
| 4 | Massive drooping canopy umbrella, bowHeight 6.76. Trunk slightly gnarled |

---

### 3.3 Elder Pine (`elder-pine`)

**Silhouette archetype:** Tall, conical, Christmas-tree shape. Low fork angle creates the upward-pointed cone. Evergreen.

| Property | Value |
|----------|-------|
| Trunk height | 2.6 (tallest base trunk except Redwood) |
| Trunk radius | 0.13 |
| Trunk taper | 0.6 |
| Trunk color | `#4E342E` / hsl(14, 27%, 24%) |
| Canopy radius | 0.7 (tighter, conical) |
| Canopy segments | 6 |
| Canopy shape | Conical (low fork angle, single bough level, short forks) |
| Canopy base color | `#1B5E20` / hsl(125, 55%, 24%) -- dark forest green |
| Forks / Boughs | 2 / 1 |
| Fork angle | 0.4 rad (very tight -- creates the cone) |
| Fork ratio | 0.55 |
| Branch count | 6 |
| Leaves per branch | 4 |
| Bow height | 1.5 (minimal bowing -- straight branches) |
| Unique trait | Conical silhouette, darkest green. Grows in winter at 30%. |
| Deciduous? | No |
| Evergreen? | Yes |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Earth mound with a tiny pine cone nub (dark brown) |
| 1 | Straight dark stem with 2 small needle-cluster discs |
| 2 | Clearly conical: trunk visible with 2 tight forks forming a narrow V |
| 3 | Full cone silhouette. 6 branch mini-trees fill the cone shape |
| 4 | Tall, dense cone. 10 branch mini-trees. The archetypical evergreen sentinel |

---

### 3.4 Cherry Blossom (`cherry-blossom`)

**Silhouette archetype:** Short, gracefully spreading branches with an oversized pink canopy. Beauty aura species.

| Property | Value |
|----------|-------|
| Trunk height | 1.6 (shortest trunk) |
| Trunk radius | 0.10 |
| Trunk taper | 0.6 |
| Trunk color | `#3E2723` / hsl(14, 27%, 19%) -- very dark, almost black bark |
| Canopy radius | 1.0 |
| Canopy segments | 10 |
| Canopy shape | Wide, flat, spreading cloud of blossoms |
| Canopy base color | `#F48FB1` / hsl(340, 82%, 76%) -- soft pink |
| Forks / Boughs | 3 / 2 |
| Fork angle | 1.1 rad |
| Fork ratio | 0.65 |
| Branch count | 10 |
| Leaves per branch | 9 (dense petals) |
| Bow height | 2.5 |
| Unique trait | Pink canopy. CSS falling petal overlay at stage 3+. Beauty aura (+10% XP, 1-tile). |
| Deciduous? | Yes |
| Evergreen? | No |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Earth mound with a tiny pink-tipped bud |
| 1 | Thin dark stem with 3 pink petal discs |
| 2 | Graceful trunk with 2 spreading branches, sparse pink cloud forming |
| 3 | Full blossom cloud. Petal CSS overlay activates. 10 branch mini-trees |
| 4 | Dense, ancient cherry. Thick dark trunk, massive pink canopy. Petals intensify |

---

### 3.5 Ghost Birch (`ghost-birch`)

**Silhouette archetype:** Pale, ethereal birch. White bark, silver-blue canopy. Glows at night.

| Property | Value |
|----------|-------|
| Trunk height | 2.0 |
| Trunk radius | 0.10 |
| Trunk taper | 0.6 |
| Trunk color | `#E0E0E0` / hsl(0, 0%, 88%) -- white/pale grey bark |
| Canopy radius | 0.8 |
| Canopy segments | 8 |
| Canopy shape | Delicate, open, airy |
| Canopy base color | `#B0BEC5` / hsl(200, 16%, 73%) -- silver-blue-grey |
| Forks / Boughs | 3 / 2 |
| Fork angle | 0.9 rad |
| Fork ratio | 0.6 |
| Branch count | 6 |
| Leaves per branch | 4 |
| Bow height | 2.0 |
| Unique trait | White trunk. Night glow (emissive material at night). 50% winter growth. |
| Deciduous? | Partially (retains some canopy in winter with reduced alpha) |
| Evergreen? | No (but special winter override to 0.5x) |

**Night glow mechanics:** See Section 6.1.

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Light grey earth mound with a white seed nub |
| 1 | White stem with 2 silvery-blue leaf discs |
| 2 | Ghostly white trunk, sparse silver canopy. Night glow begins at this stage |
| 3 | Full ethereal form. White bark clearly visible through open canopy |
| 4 | Ancient white birch with gnarled branches. Strong night glow |

---

### 3.6 Redwood (`redwood`)

**Silhouette archetype:** Towering vertical. Tallest trunk in the game. Thick, straight, with a relatively compact canopy crown.

| Property | Value |
|----------|-------|
| Trunk height | 3.5 (tallest of all species -- matches Worldtree) |
| Trunk radius | 0.20 |
| Trunk taper | 0.6 |
| Trunk color | `#8D6E63` / hsl(16, 18%, 47%) -- warm reddish-brown |
| Canopy radius | 1.0 |
| Canopy segments | 8 |
| Canopy shape | Compact crown atop a massive trunk |
| Canopy base color | `#2E7D32` / hsl(123, 46%, 33%) |
| Forks / Boughs | 3 / 2 |
| Fork angle | 0.8 rad |
| Fork ratio | 0.6 |
| Branch count | 10 |
| Leaves per branch | 5 |
| Bow height | 2.0 |
| Unique trait | Extreme height dominance. +1 Acorn at Old Growth. Evergreen. |
| Deciduous? | No |
| Evergreen? | Yes |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Reddish-brown earth mound with a bark-colored seed nub |
| 1 | Noticeably taller sprout than other species (height 1.05 at this scale) |
| 2 | Already towering over sapling-stage neighbors. Narrow trunk, small crown |
| 3 | Full redwood: imposing vertical presence. Compact green crown |
| 4 | Massive pillar. The tallest entity in any grove (effective height 4.2 units). 14 branch mini-trees |

---

### 3.7 Flame Maple (`flame-maple`)

**Silhouette archetype:** Wide, spreading maple with fiery orange canopy. Beauty aura species with 2-tile radius.

| Property | Value |
|----------|-------|
| Trunk height | 2.0 |
| Trunk radius | 0.14 |
| Trunk taper | 0.6 |
| Trunk color | `#6D4C41` / hsl(16, 25%, 34%) |
| Canopy radius | 1.1 |
| Canopy segments | 10 |
| Canopy shape | Broad, spreading, layered (like White Oak but wider and flatter) |
| Canopy base color | `#E65100` / hsl(21, 100%, 45%) -- deep orange |
| Forks / Boughs | 4 / 2 |
| Fork angle | 1.0 rad |
| Fork ratio | 0.65 |
| Branch count | 10 |
| Leaves per branch | 6 |
| Bow height | 2.5 |
| Unique trait | Perpetually orange/fiery canopy. 2x yield in Autumn. Beauty aura 2-tile. |
| Deciduous? | Yes |
| Evergreen? | No |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Earth mound with an orange-tipped seed nub |
| 1 | Stem with 3 orange leaf discs (fiery even as a sprout) |
| 2 | Spreading form emerges: 2 forks, sparse orange canopy |
| 3 | Full fiery maple. Wide spread from 4 forks. 10 branch mini-trees. Unmistakable orange |
| 4 | Grand old maple. Dense, layered orange canopy. bowHeight 3.25. 14 branch mini-trees |

---

### 3.8 Baobab (`baobab`)

**Silhouette archetype:** Squat, massively wide trunk (bottle-shaped) with sparse, flat-topped canopy. 2-tile footprint.

| Property | Value |
|----------|-------|
| Trunk height | 2.5 |
| Trunk radius | 0.30 (widest trunk -- double most species) |
| Trunk taper | 0.3 (extreme taper -- bottle shape) |
| Trunk color | `#795548` / hsl(16, 18%, 38%) |
| Canopy radius | 1.3 |
| Canopy segments | 8 |
| Canopy shape | Sparse, flat-topped umbrella |
| Canopy base color | `#558B2F` / hsl(88, 51%, 36%) -- olive green |
| Forks / Boughs | 4 / 1 (no second boughs -- sparse top) |
| Fork angle | 1.6 rad (nearly horizontal -- flat crown) |
| Fork ratio | 0.5 |
| Branch count | 4 (fewest branches -- sparse canopy) |
| Leaves per branch | 3 |
| Bow height | 1.0 (minimal bowing) |
| Unique trait | Bottle-shaped trunk (0.3 taper). Drought immune. 2-tile footprint. All 3 resources. |
| Deciduous? | Yes |
| Evergreen? | No |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Large earth mound (wider than others due to 2-tile footprint) |
| 1 | Thick stubby stem (radius 0.12 at stage 1 scale), 2 leaf discs |
| 2 | Bottle shape visible: wide base tapering sharply. 2 nearly-horizontal forks |
| 3 | Full baobab. Unmistakable fat trunk, sparse flat canopy. 4 branches |
| 4 | Ancient baobab. Massive bottle trunk. bowHeight 1.3. 8 branches. Iconic silhouette |

---

### 3.9 Silver Birch (`silver-birch`)

**Silhouette archetype:** Slender, elegant, with a light airy canopy. Similar to Ghost Birch but warmer and non-magical.

| Property | Value |
|----------|-------|
| Trunk height | 2.0 |
| Trunk radius | 0.10 |
| Trunk taper | 0.6 |
| Trunk color | `#E8E8E8` / hsl(0, 0%, 91%) -- silvery white |
| Canopy radius | 0.85 |
| Canopy segments | 8 |
| Canopy shape | Airy, open, delicate |
| Canopy base color | `#A5D6A7` / hsl(122, 38%, 74%) -- light mint green |
| Forks / Boughs | 3 / 2 |
| Fork angle | 0.9 rad |
| Fork ratio | 0.6 |
| Branch count | 6 |
| Leaves per branch | 4 |
| Bow height | 2.0 |
| Unique trait | Silver bark (lighter than Ghost Birch, no glow). +20% growth near water. |
| Deciduous? | Yes |
| Evergreen? | No |

**Differentiation from Ghost Birch:** Silver Birch is slightly lighter trunk (`#E8E8E8` vs `#E0E0E0`), has a warmer green canopy (`#A5D6A7` mint vs `#B0BEC5` blue-grey), and NO night glow effect.

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Very light grey mound with a white seed nub |
| 1 | Silver-white stem with 2 light green leaf discs |
| 2 | Slender white trunk, sparse mint-green canopy |
| 3 | Elegant birch. Bright white bark, delicate mint foliage |
| 4 | Graceful old birch. Slightly gnarled white bark. 10 branches |

---

### 3.10 Ironbark (`ironbark`)

**Silhouette archetype:** Heavy, dark, fortress-like. Thick trunk, tight conical canopy, military bearing. Storm immune.

| Property | Value |
|----------|-------|
| Trunk height | 2.4 |
| Trunk radius | 0.22 (second widest base trunk) |
| Trunk taper | 0.6 |
| Trunk color | `#37474F` / hsl(200, 16%, 26%) -- dark slate / iron grey |
| Canopy radius | 0.9 |
| Canopy segments | 6 |
| Canopy shape | Tight, dense, conical (like pine but heavier) |
| Canopy base color | `#1B5E20` / hsl(125, 55%, 24%) -- same dark green as Elder Pine |
| Forks / Boughs | 2 / 1 |
| Fork angle | 0.5 rad (tight cone) |
| Fork ratio | 0.55 |
| Branch count | 6 |
| Leaves per branch | 4 |
| Bow height | 1.5 |
| Unique trait | Dark iron-grey bark. Storm immune. 3x timber at Old Growth. Evergreen. |
| Deciduous? | No |
| Evergreen? | Yes |

**Differentiation from Elder Pine:** Ironbark has a notably darker, bluer trunk (iron vs brown), is thicker (radius 0.22 vs 0.13), and sits lower/heavier. Pine is tall and narrow; Ironbark is stocky and imposing.

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Dark slate mound with a metallic-tinted seed nub |
| 1 | Dark grey stem, very straight. 2 dark green leaf discs |
| 2 | Stocky trunk visible: thick, dark. Tight V-shaped fork |
| 3 | Full ironbark: fortress-like dark trunk. Dense conical canopy |
| 4 | Massive ironbark sentinel. bowHeight 1.95. 10 branches. Heavy and immovable |

---

### 3.11 Golden Apple (`golden-apple`)

**Silhouette archetype:** Compact orchard tree. Similar to Cherry Blossom proportions but with golden-yellow canopy and fruit-laden crown.

| Property | Value |
|----------|-------|
| Trunk height | 1.6 |
| Trunk radius | 0.12 |
| Trunk taper | 0.6 |
| Trunk color | `#5D4037` / hsl(16, 18%, 29%) -- standard bark brown |
| Canopy radius | 1.0 |
| Canopy segments | 10 |
| Canopy shape | Round, full, orchard-style |
| Canopy base color | `#FFD54F` / hsl(45, 100%, 65%) -- golden yellow |
| Forks / Boughs | 3 / 2 |
| Fork angle | 1.0 rad |
| Fork ratio | 0.65 |
| Branch count | 10 |
| Leaves per branch | 6 |
| Bow height | 2.5 |
| Unique trait | Golden-yellow canopy year-round. 3x fruit in Autumn. |
| Deciduous? | Yes |
| Evergreen? | No |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Brown earth mound with a golden seed nub |
| 1 | Brown stem with 3 golden-yellow leaf discs |
| 2 | Compact trunk, 2 forks, sparse golden canopy |
| 3 | Full golden orchard tree. Rich yellow crown. 10 branch mini-trees |
| 4 | Ancient apple tree. Dense golden canopy. bowHeight 3.25. 14 branches |

---

### 3.12 Mystic Fern (`mystic-fern`)

**Silhouette archetype:** Very short "trunk" (more of a root cluster), enormous spreading leaf canopy. Fern-like, not tree-like.

| Property | Value |
|----------|-------|
| Trunk height | 0.8 (shortest of all species by far) |
| Trunk radius | 0.08 |
| Trunk taper | 0.6 |
| Trunk color | `#4E342E` / hsl(14, 27%, 24%) |
| Canopy radius | 1.2 (large relative to tiny trunk) |
| Canopy segments | 12 (most detailed canopy) |
| Canopy shape | Wide, flat, fern-frond canopy spreading outward |
| Canopy base color | `#69F0AE` / hsl(153, 82%, 68%) -- luminous mint/teal |
| Forks / Boughs | 3 / 2 |
| Fork angle | 1.2 rad (wide spread) |
| Fork ratio | 0.6 |
| Branch count | 8 |
| Leaves per branch | 8 (high density) |
| Bow height | 1.5 |
| Unique trait | Extremely short. Massive leaf-to-trunk ratio. Luminous green. +15% growth per neighbor. |
| Deciduous? | Yes (fern fronds retract in winter) |
| Evergreen? | No |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Tiny green mound (not brown -- fern-colored earth) |
| 1 | Very short stubby stem with 3 luminous mint leaf discs |
| 2 | Fern fronds begin spreading: wide, flat canopy, almost no trunk visible |
| 3 | Full mystic fern: trunk hidden under enormous luminous green canopy |
| 4 | Ancient fern. Fronds overlap densely. 12 branch mini-trees. Glowing green carpet |

---

### 3.13 Crystalline Oak (`crystal-oak`) -- Prestige 1

**Silhouette archetype:** Oak-like structure but with pale silver trunk and teal-to-prismatic canopy that shifts color each season.

| Property | Value |
|----------|-------|
| Trunk height | 2.2 |
| Trunk radius | 0.18 |
| Trunk taper | 0.6 |
| Trunk color | `#B0BEC5` / hsl(200, 16%, 73%) -- pale silver |
| Canopy radius | 1.0 |
| Canopy segments | 10 |
| Canopy shape | Broad oak silhouette with crystalline facets |
| Canopy base color | `#80CBC4` / hsl(174, 34%, 65%) -- teal (summer default) |
| Forks / Boughs | 3 / 2 |
| Fork angle | 1.0 rad |
| Fork ratio | 0.7 |
| Branch count | 8 |
| Leaves per branch | 6 |
| Bow height | 2.0 |
| Unique trait | Prismatic seasonal tint shift. Acorn x5 yield. Evergreen. |
| Deciduous? | No |
| Evergreen? | Yes |

**Prismatic effect:** See Section 6.2.

---

### 3.14 Moonwood Ash (`moonwood-ash`) -- Prestige 2

**Silhouette archetype:** Tall, elegant ash-like tree with lavender canopy and silver-grey trunk. Grows only at night.

| Property | Value |
|----------|-------|
| Trunk height | 2.4 |
| Trunk radius | 0.14 |
| Trunk taper | 0.6 |
| Trunk color | `#CFD8DC` / hsl(200, 12%, 83%) -- cool silver-grey |
| Canopy radius | 1.1 |
| Canopy segments | 10 |
| Canopy shape | Tall, asymmetrically elegant, slightly windswept |
| Canopy base color | `#B39DDB` / hsl(265, 39%, 73%) -- lavender purple |
| Forks / Boughs | 3 / 2 |
| Fork angle | 1.0 rad |
| Fork ratio | 0.65 |
| Branch count | 8 |
| Leaves per branch | 5 |
| Bow height | 2.5 |
| Unique trait | Lavender canopy. Grows only at night. Silver shimmer at night (emissive). |
| Deciduous? | Yes |
| Evergreen? | No |

**Night shimmer:** See Section 6.3.

---

### 3.15 Worldtree (`worldtree`) -- Prestige 3

**Silhouette archetype:** The largest entity in the game. Massive trunk, enormous multi-layered canopy, 2x2 tile footprint. Boosts entire grove.

| Property | Value |
|----------|-------|
| Trunk height | 3.5 |
| Trunk radius | 0.35 (widest trunk) |
| Trunk taper | 0.6 |
| Trunk color | `#4E342E` / hsl(14, 27%, 24%) -- deep ancient bark |
| Canopy radius | 1.5 (largest canopy) |
| Canopy segments | 12 |
| Canopy shape | Multi-layered dome, almost hemisphere |
| Canopy base color | `#1B5E20` / hsl(125, 55%, 24%) -- deep forest green |
| Forks / Boughs | 5 / 2 |
| Fork angle | 0.9 rad |
| Fork ratio | 0.6 |
| Branch count | 15 |
| Leaves per branch | 8 |
| Bow height | 2.0 |
| Unique trait | Largest tree. 2x2 footprint. 5 forks. Yields all 4 resources. Boosts grove. Evergreen. |
| Deciduous? | No |
| Evergreen? | Yes |

**Stage-by-stage:**

| Stage | Description |
|-------|-------------|
| 0 | Large earth mound spanning 2x2 tiles with a glowing green seed |
| 1 | Thick stem (already wider than most species' mature trunks) with 3 dark green discs |
| 2 | Small but clearly special: thick trunk, 2 forks, canopy already hints at grandeur |
| 3 | Imposing world tree. 5 forks create a dense multi-layered dome. 15 branches |
| 4 | Mythical scale. Trunk height 4.025, 19 branches, canopy radius 1.5 at 1.2x scale = 1.8. Dwarfs everything |

---

## 4. Seasonal Canopy Color Tables

All colors in HSL. The base canopy color (from `meshParams.color.canopy`) is the **summer** value. Other seasons apply a color transform.

### 4.1 Deciduous Species Seasonal Colors

| Species | Spring HSL | Summer HSL | Autumn HSL | Winter HSL |
|---------|-----------|-----------|-----------|-----------|
| White Oak | hsl(122, 45%, 52%) | hsl(122, 41%, 39%) | hsl(30, 75%, 45%) | hsl(122, 20%, 22%) * |
| Weeping Willow | hsl(122, 44%, 68%) | hsl(122, 40%, 57%) | hsl(40, 65%, 50%) | hsl(122, 18%, 30%) * |
| Cherry Blossom | hsl(340, 85%, 82%) | hsl(340, 82%, 76%) | hsl(340, 50%, 55%) | hsl(340, 15%, 40%) * |
| Ghost Birch | hsl(200, 25%, 82%) | hsl(200, 16%, 73%) | hsl(35, 30%, 60%) | hsl(200, 10%, 50%) |
| Flame Maple | hsl(25, 90%, 55%) | hsl(21, 100%, 45%) | hsl(15, 95%, 50%) | hsl(21, 30%, 30%) * |
| Silver Birch | hsl(122, 45%, 82%) | hsl(122, 38%, 74%) | hsl(38, 55%, 60%) | hsl(122, 15%, 35%) * |
| Golden Apple | hsl(50, 100%, 72%) | hsl(45, 100%, 65%) | hsl(40, 100%, 55%) | hsl(45, 30%, 35%) * |
| Mystic Fern | hsl(153, 85%, 75%) | hsl(153, 82%, 68%) | hsl(153, 50%, 50%) | hsl(153, 20%, 30%) * |
| Baobab | hsl(90, 55%, 48%) | hsl(88, 51%, 36%) | hsl(45, 50%, 40%) | hsl(88, 20%, 25%) * |
| Moonwood Ash | hsl(265, 48%, 80%) | hsl(265, 39%, 73%) | hsl(265, 30%, 55%) | hsl(265, 12%, 35%) * |

`*` = Deciduous winter behavior: canopy geometry is retained but vertex color alpha is reduced to 40% opacity (or rendered at 40% vertex color brightness as a simpler fallback since vertex colors lack alpha). Alternatively, only 30% of leaf disc geometries are generated for the winter template mesh, creating a "bare branches" look.

**Winter deciduous strategy (recommended implementation):**

For deciduous species in winter, generate a dedicated winter template mesh variant:
- Set `leavesOnBranch` to `max(1, floor(speciesLeaves * 0.2))` (only 20% of leaves)
- Use the winter HSL color for the remaining leaves
- The trunk and branch structure remains fully visible, creating the bare-branch silhouette

### 4.2 Evergreen Species Seasonal Colors

Evergreen species retain full canopy year-round. Colors shift subtly:

| Species | Spring HSL | Summer HSL | Autumn HSL | Winter HSL |
|---------|-----------|-----------|-----------|-----------|
| Elder Pine | hsl(125, 55%, 30%) | hsl(125, 55%, 24%) | hsl(125, 45%, 22%) | hsl(125, 40%, 18%) |
| Redwood | hsl(123, 50%, 40%) | hsl(123, 46%, 33%) | hsl(123, 40%, 28%) | hsl(123, 35%, 22%) |
| Ironbark | hsl(125, 55%, 30%) | hsl(125, 55%, 24%) | hsl(125, 45%, 20%) | hsl(125, 40%, 16%) |
| Crystal Oak | hsl(174, 40%, 72%) | hsl(174, 34%, 65%) | hsl(174, 28%, 55%) | hsl(174, 22%, 45%) |
| Worldtree | hsl(125, 55%, 30%) | hsl(125, 55%, 24%) | hsl(125, 50%, 22%) | hsl(125, 45%, 20%) |

Note: Crystal Oak's seasonal colors are OVERRIDDEN by its prismatic effect (Section 6.2). The values above are the base before prismatic tint is applied.

### 4.3 Season Color Derivation Rules

Rather than hand-specifying every color, species canopy colors can be computed from their base (summer) color using these transforms:

```
Spring:   H same,   S +5%,  L +13%
Summer:   H same,   S same, L same      (base)
Autumn:   H -> warm shift toward hsl(30-40), S -10%, L +5% (deciduous)
          H same,   S -10%, L -6%        (evergreen)
Winter:   H same,   S -25%, L -18%       (all types)
```

Deciduous autumn shift: Hue rotates toward the warm range (30--45 degrees). The shift amount depends on the species' base hue distance from warm:
- Green-hued species (H 88--153): full shift to H 30--45
- Already warm species (Flame Maple, Golden Apple): minimal shift (just intensify)
- Pink species (Cherry Blossom): shift toward mauve H 340 -> reduced saturation

### 4.4 Template Cache Keys

Each unique visual state requires a separate template geometry in the cache:

```
Key format: ${speciesId}_${stage}_${season}
Night variant: ${speciesId}_${stage}_${season}_night

Examples:
  white-oak_3_summer
  ghost-birch_4_winter_night
  crystal-oak_3_autumn
```

Season change triggers a full template cache rebuild for all currently visible species. This is acceptable because:
1. Seasons change infrequently (~36 real-time hours per season)
2. Template generation is amortized across frames via a rebuild queue
3. Only species with trees currently on the grid need templates

---

## 5. Growth Animation System

### 5.1 Scale Interpolation

Growth is continuous, not instantaneous. The `getStageScale()` function provides smooth interpolation:

```typescript
function getStageScale(stage: number, progress: number): number {
  const baseScale = STAGE_VISUALS[stage].scale;
  if (stage >= MAX_STAGE) return baseScale;
  const nextScale = STAGE_VISUALS[stage + 1].scale;
  const partialPreview = progress * 0.3;
  return baseScale + (nextScale - baseScale) * partialPreview;
}
```

This means a tree at stage 2 with 50% progress has scale: `0.40 + (0.80 - 0.40) * 0.15 = 0.46`. The tree "previews" up to 30% of the next stage's size before transitioning.

### 5.2 Per-Frame Lerp

The mesh scale is NOT set directly to `getStageScale()` each frame. Instead, a lerp-based approach prevents jarring pops:

```typescript
// In the render loop mesh sync step
const targetScale = getStageScale(tree.stage, tree.progress);
const currentScale = mesh.scale.x; // Uniform scale, so x = y = z
const lerpFactor = Math.min(1, deltaTime * GROWTH_LERP_SPEED);
const newScale = currentScale + (targetScale - currentScale) * lerpFactor;
mesh.scale.setScalar(newScale);
```

**Constants:**

| Parameter | Value | Notes |
|-----------|-------|-------|
| `GROWTH_LERP_SPEED` | 3.0 | Units: per second. At 60fps, dt=0.0167, factor=0.05. Smooth ease-out. |
| Max lerp factor | 1.0 | Clamped to prevent overshoot. |
| Effective 90% settle time | ~0.77 seconds | `ln(0.1) / ln(1 - 3/60)` at 60fps |
| Effective 99% settle time | ~1.53 seconds | Visually indistinguishable from target |

This produces an **ease-out** curve: fast initial movement, decelerating approach. The tree appears to "pop" slightly then settle into its new size.

### 5.3 Stage Transition Effects

When `tree.progress >= 1.0` and `tree.stage` increments:

1. **Geometry swap.** The mesh's BufferGeometry is replaced with the template for the new stage (from cache). This is the only time geometry changes -- between-stage growth is scale-only.
2. **Scale reset.** `mesh.scale` is set to the previous stage's max preview scale (e.g., transitioning from stage 2 to 3: scale starts at `0.40 + 0.40*0.3 = 0.52`), then lerps toward the new stage's base scale (0.80). This prevents a visible "shrink" at transition.
3. **Particle burst.** A ring of 6--10 green sparkle particles (FloatingParticles) emit from the tree's base position, rising 0.5 units over 0.8 seconds. Color matches the current seasonal canopy color.
4. **Haptic feedback.** On mobile (Capacitor bridge), a light impact haptic fires on stage transition.

### 5.4 Stage Transition Timeline

```
Frame N:   tree.progress reaches 1.0
           tree.stage increments (0->1, 1->2, etc.)
           tree.progress resets to 0.0

Frame N+1: New geometry loaded from template cache
           mesh.scale set to smooth-start value (see 5.3.2)
           Particle burst queued
           Haptic fired

Frames N+1 to N+~90 (1.5 sec at 60fps):
           mesh.scale lerps from smooth-start toward new base scale
           Particles animate and fade
```

### 5.5 Intermediate Visual States

At any point between stage transitions, a tree's visual state is:

| Progress | Visual |
|----------|--------|
| 0% | Exact stage geometry at stage's base scale |
| 25% | Same geometry, scale previewed ~7.5% toward next stage |
| 50% | Same geometry, scale previewed ~15% toward next stage |
| 75% | Same geometry, scale previewed ~22.5% toward next stage |
| 100% | Transition: geometry swaps, scale resets, particle burst |

There is no geometric interpolation between stages. Only the uniform scale changes. This is intentional -- the geometry swap at transition IS the reward moment.

---

## 6. Prestige Species Special Effects

### 6.1 Ghost Birch -- Night Glow

**Concept:** The Ghost Birch's white bark emits a soft blue-white glow during nighttime hours (22:00--05:00 game time).

**Implementation -- Emissive Material Variant:**

Ghost Birch trees use a separate material instance during night hours. The night material has:

| Property | Day Value | Night Value |
|----------|----------|-------------|
| `emissive` | `#000000` (none) | `#88CCFF` (soft blue-white) |
| `emissiveIntensity` | 0.0 | 0.35 |
| Trunk vertex color | `#E0E0E0` | `#E8F0FF` (slightly blue-shifted white) |
| Canopy vertex color | Current season | Same, +10% lightness |

**Glow radius:** The emissive effect is material-based only (no bloom post-processing). On the diorama camera at standard distance, this creates a visible bright spot without requiring a post-processing pipeline.

**Template cache key:** Night variants are cached as `ghost-birch_${stage}_${season}_night`. The geometry is identical to the day variant; only the vertex colors baked into the BufferGeometry differ (blue-shifted trunk, brighter canopy).

**Transition:** At dawn (05:00) and dusk (22:00), the material swaps. No gradual fade -- the glow snaps on/off at the threshold. This is a deliberate design choice: the "magic" feeling comes from the sudden transformation.

**Stages affected:** Stages 2, 3, 4 only. Seeds and sprouts (stages 0, 1) do not glow.

### 6.2 Crystalline Oak -- Prismatic Seasonal Tints

**Concept:** The Crystalline Oak's canopy shifts through a spectrum of prismatic colors with each season, as if refracting light through crystal.

**Prismatic color palette by season:**

| Season | Canopy HSL | Hex | Description |
|--------|-----------|-----|-------------|
| Spring | hsl(280, 50%, 72%) | `#C39BD3` | Amethyst violet |
| Summer | hsl(174, 34%, 65%) | `#80CBC4` | Teal (base) |
| Autumn | hsl(35, 65%, 60%) | `#D4A843` | Amber crystal |
| Winter | hsl(210, 55%, 70%) | `#7EB3DB` | Ice blue |

**Implementation:** The prismatic tint is applied via vertex colors during template mesh generation. When season changes, the Crystal Oak template is regenerated with the new prismatic canopy color. The trunk color remains constant (`#B0BEC5`).

**Shimmer effect (optional enhancement):** At stage 3+ during clear weather, apply a slow vertex color oscillation:
- Cycle: 4-second period
- Amplitude: +/- 8% lightness on the canopy vertex colors
- Implementation: In the per-frame mesh sync, modulate the mesh material's `color` property between `1.0` and `0.92` with `Math.sin(time * Math.PI / 2) * 0.04 + 0.96`
- This creates a subtle "breathing" light effect without requiring per-vertex animation

### 6.3 Moonwood Ash -- Silver Night Shimmer

**Concept:** The Moonwood Ash has a silver shimmer visible during night hours, reflecting moonlight.

**Implementation:**

| Property | Day Value | Night Value |
|----------|----------|-------------|
| `emissive` | `#000000` | `#C0C0E0` (soft silver-violet) |
| `emissiveIntensity` | 0.0 | 0.25 |
| Trunk vertex color | `#CFD8DC` | `#D8E0F0` (slightly blue-shifted) |
| Canopy vertex color | Current season | Current season, +8% lightness |

**Distinction from Ghost Birch glow:** Moonwood Ash has a cooler, more violet-tinted glow (matching its lavender canopy) compared to Ghost Birch's warmer blue-white. The emissive intensity is lower (0.25 vs 0.35) -- a shimmer rather than a glow.

**Growth restriction:** Moonwood Ash only grows during night hours (22:00--05:00). During daytime, growth progress is frozen (multiplier = 0). The visual shimmer is the "tell" that the tree is active and growing.

### 6.4 Cherry Blossom Falling Petals (CSS Overlay)

**Concept:** When any Cherry Blossom tree is at stage 3 or 4, a falling petal CSS overlay activates across the game viewport.

This is already implemented in `WeatherOverlay.tsx`. Parameters for reference:

| Parameter | Value |
|-----------|-------|
| Petal count | 15--25 animated divs |
| Fall speed | 2--4 seconds per petal (randomized) |
| Drift | Horizontal sine wave, amplitude 20--40px |
| Color | `hsl(340, 82%, 76%)` matching Cherry Blossom canopy |
| Opacity | 0.6--0.9 (randomized per petal) |
| Size | 4--8px width, 3--6px height |
| Wind drift | Follows current weather wind direction if windstorm active |
| Z-index | Above game canvas, below HUD elements |

---

## 7. Instanced Rendering Strategy

### 7.1 Architecture Overview

Trees are rendered using Three.js `InstancedMesh` for maximum draw call efficiency. One `InstancedMesh` per unique visual configuration (species + stage + season + night).

```
InstancedMesh Pool
  |
  +-- white-oak_2_summer    (InstancedMesh, capacity 20)
  +-- white-oak_3_summer    (InstancedMesh, capacity 20)
  +-- elder-pine_3_summer   (InstancedMesh, capacity 20)
  +-- ghost-birch_3_winter_night (InstancedMesh, capacity 10)
  ...
```

### 7.2 Template Cache

The template cache holds pre-generated BufferGeometry instances:

```typescript
interface TemplateCache {
  // Key: speciesId_stage_season[_night]
  geometries: Map<string, THREE.BufferGeometry>;
  // Timestamp of last access (for LRU eviction)
  lastAccess: Map<string, number>;
}
```

**Cache lifecycle:**

1. **On first tree plant of a species:** Generate templates for stages 0--2 of that species in the current season. Stage 3--4 templates are generated lazily when a tree first reaches those stages.
2. **On season change:** Invalidate all templates. Regenerate lazily as meshes are synced.
3. **On night/day transition (Ghost Birch, Moonwood Ash only):** Swap between day and night template variants.
4. **Maximum cache size:** `15 species * 5 stages * 4 seasons * 2 (day/night) = 600` entries theoretical max. In practice, ~30--60 entries are active at any time.

### 7.3 InstancedMesh Management

```typescript
interface TreeInstancePool {
  // Key: same as template cache
  meshes: Map<string, THREE.InstancedMesh>;
  // Maps entity ID to instance index within its InstancedMesh
  entityToInstance: Map<string, { key: string; index: number }>;
}
```

**Instance matrix updates:**

- **Growing trees (stages 0--3):** `matrixAutoUpdate = true`. Matrix updated each frame during the mesh sync step with lerped scale.
- **Static trees (stage 4):** `matrixAutoUpdate = false`. Matrix set once and frozen via `instanceMatrix.needsUpdate = false` after initial placement.

**Capacity management:**

- Each InstancedMesh is created with an initial capacity of 20 instances.
- If capacity is exceeded, a new InstancedMesh is created with 2x capacity, all instances are migrated, and the old mesh is disposed.
- Unused instances have their matrices set to zero-scale (effectively invisible).

### 7.4 Draw Call Budget

| Scenario | Max Unique Configs | Draw Calls | Notes |
|----------|-------------------|------------|-------|
| Early game (12x12 grid, 1--3 species, stages 0--2) | 6--9 | 6--9 | Well under budget |
| Mid game (20x20 grid, 6--8 species, mixed stages) | 15--25 | 15--25 | Comfortable |
| Late game (32x32 grid, 12+ species, all stages) | 30--45 | 30--45 | Approaches budget |
| Worst case (all 15 species, all 5 stages, night) | 50+ | 50+ | Mitigated by LOD |

**Budget target:** < 50 draw calls total (including ground, player, structures, sky). Tree draw calls should stay under 35.

### 7.5 LOD Strategy

To keep draw calls under budget in worst-case scenarios:

**Distance-based simplification** (from diorama camera center):

| Distance from Camera Center | LOD Level | Geometry |
|-----------------------------|-----------|----------|
| 0--8 tiles | Full | Species-specific SPS mesh |
| 8--16 tiles | Reduced | Stage 2 geometry used for stages 2-3 (skip crown mini-trees) |
| 16+ tiles | Billboard | Flat quad with baked color (single triangle pair) |

In practice, the diorama camera sees the entire 32x32 grid (max size), so distance-based LOD primarily applies to the outermost ring of trees on the largest grid.

**Species merge optimization:** At LOD level "Reduced", species with identical canopy shapes (e.g., Silver Birch + Ghost Birch) can share a single InstancedMesh with per-instance vertex color override. This is an advanced optimization for post-launch.

---

## 8. Vertex Budget Analysis

### 8.1 Per-Tree Vertex Counts

Counts computed from the SPS tree generator with `BRANCH_SIDES = 12`:

**Trunk and branches (wood):**

| Component | Formula | Vertices |
|-----------|---------|----------|
| Trunk cylinder | `(slices + 1) * BRANCH_SIDES` | 132 (at 10 slices) |
| Per fork branch | `(slices + 1) * BRANCH_SIDES` | 132 each |
| Per bough branch | `(slices + 1) * BRANCH_SIDES` | 132 each |

For a 3-fork, 2-bough species: `132 + 3*132 + 9*132 = 1716` wood vertices.
For a 2-fork, 1-bough species: `132 + 2*132 = 396` wood vertices.

**Leaves:**

| Component | Formula | Vertices |
|-----------|---------|----------|
| Per leaf disc | CircleGeometry(r, 8) = 9 vertices | 9 each |
| Total leaves | `2 * leavesOnBranch * forks^boughs` | Varies |

For 5 leaves, 3 forks, 2 boughs: `2 * 5 * 9 * 9 = 810` leaf vertices.

**Crown mini-trees:**

| Component | Formula | Vertices |
|-----------|---------|----------|
| Per mini-tree | Same as trunk wood vertices / fork count | ~132 |
| Fork-end minis | `forks^(boughs+1)` | 27 for 3-fork 2-bough |
| Random branch minis | `branches` count | 8 typical |

Crown mini-tree total: `(27 + 8) * 132 = 4620` -- but these are scaled-down copies, and their contribution to visual detail is disproportionately large relative to their vertex cost.

### 8.2 Per-Species Vertex Estimates (Stage 3, Mature)

| Species | Wood Verts | Leaf Verts | Crown Verts | Total | Draw Calls |
|---------|-----------|-----------|------------|-------|------------|
| White Oak | 1716 | 810 | 4620 | ~7146 | 1 |
| Weeping Willow | 2772 | 2880 | 9240 | ~14892 | 1 |
| Elder Pine | 396 | 144 | 792 | ~1332 | 1 |
| Cherry Blossom | 1716 | 1458 | 4620 | ~7794 | 1 |
| Ghost Birch | 1716 | 648 | 3960 | ~6324 | 1 |
| Redwood | 1716 | 810 | 4620 | ~7146 | 1 |
| Flame Maple | 2772 | 1728 | 9240 | ~13740 | 1 |
| Baobab | 660 | 432 | 2640 | ~3732 | 1 |
| Silver Birch | 1716 | 648 | 3960 | ~6324 | 1 |
| Ironbark | 396 | 144 | 792 | ~1332 | 1 |
| Golden Apple | 1716 | 972 | 4620 | ~7308 | 1 |
| Mystic Fern | 1716 | 1296 | 4620 | ~7632 | 1 |
| Crystal Oak | 1716 | 972 | 4620 | ~7308 | 1 |
| Moonwood Ash | 1716 | 810 | 4620 | ~7146 | 1 |
| Worldtree | 3960 | 3600 | 16500 | ~24060 | 1 |

### 8.3 Scene Vertex Totals

Since InstancedMesh reuses geometry, the vertex count sent to the GPU is:

```
GPU verts = sum of (unique template geometry verts * instance count)
```

**Worst case: 32x32 grid, fully planted (1024 tiles, ~730 tree tiles at 70% soil):**

If all 730 trees were Worldtree (worst case): `730 * 24060 = 17.5M vertices` -- far too many.

**Realistic case: 730 trees, mixed species at mixed stages:**

| Stage Distribution (730 trees) | Avg Verts | Total GPU Verts |
|-------------------------------|-----------|----------------|
| 200 at stage 0--1 (60--100 verts) | 80 | 16,000 |
| 200 at stage 2 (200--500 verts) | 350 | 70,000 |
| 200 at stage 3 (1300--8000 verts) | 5,000 | 1,000,000 |
| 130 at stage 4 (1300--24000 verts) | 6,000 | 780,000 |
| **Total** | | **~1.87M** |

1.87M vertices is acceptable for desktop but heavy for mobile. Mitigation strategies:

1. **Reduce `BRANCH_SIDES` to 8** for mobile (saves ~33% vertices on all wood).
2. **Cap crown mini-trees at 12** per tree (saves ~40% on Worldtree/Willow).
3. **LOD: skip crown mini-trees** for trees > 10 tiles from camera center.
4. **Frustum culling** by the Three.js renderer (automatic for InstancedMesh).

### 8.4 Recommended `BRANCH_SIDES` by Platform

| Platform | BRANCH_SIDES | Approx Savings vs 12 |
|----------|-------------|---------------------|
| Desktop | 12 | Baseline |
| Mobile (modern) | 8 | ~33% |
| Mobile (low-end) | 6 | ~50% |

Detect via `navigator.hardwareConcurrency` or `renderer.capabilities.maxTextureSize` at startup and set `BRANCH_SIDES` globally before any template generation.

---

## 9. Config JSON Schema

The visual spec should be expressible as a JSON config to decouple art direction from code. This extends the existing `species.json` with a new `visualProfile` section.

### 9.1 Schema Definition

```typescript
interface SpeciesVisualProfile {
  /** SPS generator overrides (existing SPECIES_SPS data) */
  sps: {
    trunkHeight: number;
    trunkTaper: number;        // 0.0-1.0, default 0.6
    trunkSlices: number;       // default 10
    boughs: 1 | 2;
    forks: number;             // 2-5
    forkAngle: number;         // radians, 0.4-1.6
    forkRatio: number;         // 0.5-0.8
    branches: number;          // crown mini-tree count, 4-15
    branchAngle: number;       // radians, default 1.2
    bowFreq: number;           // default 2
    bowHeight: number;         // 1.0-5.2
    leavesOnBranch: number;    // 3-10
    leafWHRatio: number;       // default 0.6
  };

  /** Colors per season (HSL arrays: [H, S%, L%]) */
  canopyColors: {
    spring: [number, number, number];
    summer: [number, number, number];
    autumn: [number, number, number];
    winter: [number, number, number];
  };

  /** Trunk color does NOT change with season */
  trunkColor: [number, number, number]; // HSL

  /** Behavioral flags */
  deciduous: boolean;
  winterLeafRetention: number; // 0.0-1.0 (0 = fully bare, 1 = fully evergreen)

  /** Stage overrides */
  stageOverrides?: {
    /** Stage 2 (sapling) -- SPS parameter reduction multipliers */
    sapling?: {
      forksCap: number;       // Max forks at stage 2 (default: 2)
      branchMult: number;     // Multiply branch count (default: 0.3)
      leavesMult: number;     // Multiply leaves/branch (default: 0.5)
    };
    /** Stage 4 (old growth) -- SPS parameter enhancement */
    oldGrowth?: {
      trunkHeightMult: number; // Multiply trunk height (default: 1.15)
      branchAdd: number;       // Add to branch count (default: 4)
      leavesAdd: number;       // Add to leaves/branch (default: 2)
      bowHeightMult: number;   // Multiply bow height (default: 1.3)
    };
  };

  /** Special effects (prestige species) */
  effects?: {
    nightGlow?: {
      emissiveColor: string;       // Hex color
      emissiveIntensity: number;   // 0.0-1.0
      trunkColorNight: string;     // Hex override
      canopyLightnessBoost: number; // 0-20 (percentage points)
      minStage: number;            // Minimum stage for glow (default: 2)
    };
    prismatic?: {
      seasonColors: {
        spring: string;  // Hex
        summer: string;
        autumn: string;
        winter: string;
      };
      shimmerEnabled: boolean;
      shimmerPeriod: number;       // Seconds
      shimmerAmplitude: number;    // 0.0-0.1
    };
    fallingParticles?: {
      type: "petals" | "leaves" | "sparkles";
      color: string;               // Hex
      count: [number, number];     // [min, max] particles
      fallDuration: [number, number]; // [min, max] seconds
      driftAmplitude: [number, number]; // [min, max] px
      minStage: number;
      cssOverlay: boolean;         // true = CSS div overlay, false = Three.js particles
    };
  };
}
```

### 9.2 Example Config Entry (Ghost Birch)

```json
{
  "id": "ghost-birch",
  "visualProfile": {
    "sps": {
      "trunkHeight": 2.0,
      "trunkTaper": 0.6,
      "trunkSlices": 10,
      "boughs": 2,
      "forks": 3,
      "forkAngle": 0.9,
      "forkRatio": 0.6,
      "branches": 6,
      "branchAngle": 1.2,
      "bowFreq": 2,
      "bowHeight": 2.0,
      "leavesOnBranch": 4,
      "leafWHRatio": 0.6
    },
    "canopyColors": {
      "spring": [200, 25, 82],
      "summer": [200, 16, 73],
      "autumn": [35, 30, 60],
      "winter": [200, 10, 50]
    },
    "trunkColor": [0, 0, 88],
    "deciduous": false,
    "winterLeafRetention": 0.6,
    "effects": {
      "nightGlow": {
        "emissiveColor": "#88CCFF",
        "emissiveIntensity": 0.35,
        "trunkColorNight": "#E8F0FF",
        "canopyLightnessBoost": 10,
        "minStage": 2
      }
    }
  }
}
```

### 9.3 Example Config Entry (Crystalline Oak)

```json
{
  "id": "crystal-oak",
  "visualProfile": {
    "sps": {
      "trunkHeight": 2.2,
      "trunkTaper": 0.6,
      "trunkSlices": 10,
      "boughs": 2,
      "forks": 3,
      "forkAngle": 1.0,
      "forkRatio": 0.7,
      "branches": 8,
      "branchAngle": 1.2,
      "bowFreq": 2,
      "bowHeight": 2.0,
      "leavesOnBranch": 6,
      "leafWHRatio": 0.6
    },
    "canopyColors": {
      "spring": [174, 40, 72],
      "summer": [174, 34, 65],
      "autumn": [174, 28, 55],
      "winter": [174, 22, 45]
    },
    "trunkColor": [200, 16, 73],
    "deciduous": false,
    "winterLeafRetention": 1.0,
    "effects": {
      "prismatic": {
        "seasonColors": {
          "spring": "#C39BD3",
          "summer": "#80CBC4",
          "autumn": "#D4A843",
          "winter": "#7EB3DB"
        },
        "shimmerEnabled": true,
        "shimmerPeriod": 4.0,
        "shimmerAmplitude": 0.04
      }
    }
  }
}
```

---

## 10. R3F Component Architecture

### 10.1 Component Hierarchy

```
<Canvas>
  <TreeInstanceManager>          -- Top-level tree rendering orchestrator
    <TreeInstancePool             -- One per unique template key
      key="white-oak_3_summer"
      geometry={templateCache.get("white-oak_3_summer")}
      material={vertexColorMaterial}
      count={instanceCount}
    />
    <TreeInstancePool
      key="ghost-birch_3_winter_night"
      geometry={...}
      material={emissiveVertexColorMaterial}
      count={...}
    />
    ...
  </TreeInstanceManager>
  <SeedMeshPool />               -- Stage 0 uses a simpler shared geometry
  <SproutMeshPool />             -- Stage 1 uses a simpler shared geometry
</Canvas>
```

### 10.2 TreeInstanceManager Pseudocode

```tsx
function TreeInstanceManager() {
  const trees = useEntities(treesQuery);
  const { season, isNight } = useTimeState();
  const templateCache = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const instancePools = useRef<Map<string, InstancePoolData>>(new Map());

  // On season change or night transition, rebuild affected templates
  useEffect(() => {
    rebuildTemplatesForSeason(templateCache.current, season, isNight);
  }, [season, isNight]);

  // Per-frame: update instance matrices
  useFrame((_, delta) => {
    for (const entity of trees) {
      const tree = entity.tree!;
      const key = getTemplateKey(tree.speciesId, tree.stage, season, isNight);

      // Ensure template exists
      if (!templateCache.current.has(key)) {
        const geom = createTreeGeometry(tree.speciesId, tree.stage, tree.meshSeed);
        applySeasonalColors(geom, tree.speciesId, season, isNight);
        templateCache.current.set(key, geom);
      }

      // Get or create InstancedMesh for this key
      const pool = getOrCreatePool(instancePools.current, key, templateCache.current.get(key)!);

      // Update instance matrix with lerped scale
      const targetScale = getStageScale(tree.stage, tree.progress);
      const instanceIdx = getInstanceIndex(entity.id, pool);

      if (tree.stage < 4) {
        // Animate: lerp toward target scale
        const matrix = new THREE.Matrix4();
        pool.mesh.getMatrixAt(instanceIdx, matrix);
        const currentScale = extractScaleFromMatrix(matrix);
        const lerpedScale = currentScale + (targetScale - currentScale) * Math.min(1, delta * 3.0);

        matrix.makeTranslation(entity.position!.x, entity.position!.y, entity.position!.z);
        matrix.scale(new THREE.Vector3(lerpedScale, lerpedScale, lerpedScale));
        pool.mesh.setMatrixAt(instanceIdx, matrix);
        pool.mesh.instanceMatrix.needsUpdate = true;
      }
      // Stage 4: matrix is frozen, no per-frame update
    }
  });

  return (
    <>
      {Array.from(instancePools.current.entries()).map(([key, pool]) => (
        <primitive key={key} object={pool.mesh} />
      ))}
    </>
  );
}
```

### 10.3 Material Setup

```tsx
// Standard tree material (most species)
const treeMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  // Smooth shading for modern Zelda-style rendering
  flatShading: false,
});

// Emissive tree material (Ghost Birch night, Moonwood Ash night)
const emissiveTreeMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  flatShading: true,
  emissive: new THREE.Color("#88CCFF"),
  emissiveIntensity: 0.35,
});

// Crystal Oak shimmer material (animated emissive)
const prismaticMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  flatShading: true,
  emissive: new THREE.Color("#80CBC4"),
  emissiveIntensity: 0.08,  // Subtle baseline shimmer
});
```

### 10.4 Seed & Sprout Geometry (Stages 0--1)

Stages 0 and 1 bypass the SPS generator for performance and visual clarity:

```tsx
function createSeedGeometry(speciesId: string): THREE.BufferGeometry {
  const species = getSpeciesData(speciesId);
  const trunkColor = new THREE.Color(species?.meshParams.color.trunk ?? "#5D4037");

  // Flattened sphere (earth mound)
  const mound = new THREE.SphereGeometry(0.3, 6, 4);
  mound.scale(1, 0.4, 1); // Squash Y

  // Seed nub on top
  const nub = new THREE.CylinderGeometry(0.03, 0.04, 0.05, 4);
  nub.translate(0, 0.12, 0);

  // Merge and bake vertex colors
  const merged = mergeGeometries([mound, nub]);
  bakeVertexColors(merged, new THREE.Color("hsl(15, 30%, 28%)"), /* mound */
                           trunkColor.clone().offsetHSL(0, 0, 0.15) /* nub */);

  mound.dispose();
  nub.dispose();
  return merged;
}

function createSproutGeometry(
  speciesId: string,
  season: string,
): THREE.BufferGeometry {
  const species = getSpeciesData(speciesId);
  const trunkColor = new THREE.Color(species?.meshParams.color.trunk ?? "#5D4037");
  const canopyColor = getSeasonalCanopyColor(speciesId, season);

  const stemHeight = (species?.meshParams.trunkHeight ?? 1.8) * 0.3;
  const stemRadius = (species?.meshParams.trunkRadius ?? 0.15) * 0.4;

  // Stem
  const stem = new THREE.CylinderGeometry(stemRadius * 0.7, stemRadius, stemHeight, 6);
  stem.translate(0, stemHeight / 2, 0);

  // Leaf discs
  const leafCount = (species?.meshParams.canopySegments ?? 8) >= 10 ? 3 : 2;
  const leafRadius = (species?.meshParams.canopyRadius ?? 0.9) * 0.15;
  const leafGeoms: THREE.BufferGeometry[] = [];

  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.CircleGeometry(leafRadius, 6);
    const angle = (i / leafCount) * Math.PI * 2;
    const tilt = Math.PI / 4; // 45-degree tilt outward
    leaf.rotateX(tilt);
    leaf.rotateY(angle);
    leaf.translate(
      Math.sin(angle) * leafRadius * 0.5,
      stemHeight + leafRadius * 0.3,
      Math.cos(angle) * leafRadius * 0.5,
    );
    leafGeoms.push(leaf);
  }

  // Merge
  const parts = [stem, ...leafGeoms];
  const merged = mergeGeometries(parts);
  bakeVertexColors(merged, trunkColor, canopyColor.clone().offsetHSL(0, 0, 0.05));

  for (const p of parts) p.dispose();
  return merged;
}
```

### 10.5 Template Key Function

```typescript
function getTemplateKey(
  speciesId: string,
  stage: number,
  season: string,
  isNight: boolean,
): string {
  // Night variants only for species with night effects
  const needsNightVariant =
    isNight && (speciesId === "ghost-birch" || speciesId === "moonwood-ash");

  let key = `${speciesId}_${stage}_${season}`;
  if (needsNightVariant) {
    key += "_night";
  }
  return key;
}
```

---

## 11. Implementation Notes

### 11.1 Harvest-Ready Visual Indicator

When a tree at stage 3+ has `harvestable.ready === true`, a subtle visual cue should signal the player:

**Option A (recommended): Colored ring on ground.**
A flat ring mesh (TorusGeometry, major radius 0.4, minor radius 0.03, 16 segments) placed at the tree's base position, Y=0.01 (just above ground). Color: warm gold `#FFD54F` with 60% opacity. This avoids modifying the tree geometry and uses a single shared InstancedMesh for all harvest indicators.

**Option B: Material color pulse.**
Multiply the tree material's `color` by a pulsing value `0.9 + 0.1 * Math.sin(time * 3)`. Subtle and no extra geometry, but requires a per-tree material instance (expensive).

### 11.2 Watered State Indicator

Trees at stages 0--2 that are currently watered (`tree.watered === true`) should show a small blue droplet or wet-ground effect:

- Dark circle on the ground around the tree base (DynamicTexture or a flat CircleGeometry at Y=0.005)
- Color: `hsl(210, 60%, 30%)` -- dark blue-brown (wet earth)
- Disappears on stage transition (watered resets to false)

### 11.3 2-Tile Footprint Trees (Baobab, Worldtree)

Trees with 2-tile footprint occupy 4 grid cells (2x2). Their mesh is centered at the geometric center of the 4 cells:

```
Grid position: (gridX, gridZ) = top-left cell
Mesh world position: (gridX + 0.5, 0, gridZ + 0.5)
```

All 4 cells are marked `occupied: true` with `treeEntityId` pointing to the same entity. Interaction (harvest, water) works from any of the 4 cells.

### 11.4 Season Transition Rebuild Queue

When the season changes, all template meshes become stale. Rather than rebuilding all templates synchronously (which would cause a frame spike), use a staggered rebuild queue:

```typescript
const TEMPLATES_PER_FRAME = 3; // Rebuild at most 3 templates per frame

function processTemplateRebuildQueue(
  queue: string[],
  cache: Map<string, THREE.BufferGeometry>,
  season: string,
  isNight: boolean,
): void {
  const batch = queue.splice(0, TEMPLATES_PER_FRAME);
  for (const key of batch) {
    const [speciesId, stageStr] = key.split("_");
    const stage = parseInt(stageStr, 10);
    // Dispose old geometry
    cache.get(key)?.dispose();
    // Generate new
    const geom = createTreeGeometry(speciesId, stage, /* template seed */ 0);
    applySeasonalColors(geom, speciesId, season, isNight);
    cache.set(key, geom);
  }
}
```

At 3 templates per frame and ~30 active templates, the full rebuild takes 10 frames (~167ms at 60fps). The visual transition appears as a rapid "wave" of color change across the grove -- which is actually a pleasant effect.

### 11.5 Performance Budget Summary

| Metric | Target | Constraint Source |
|--------|--------|------------------|
| Draw calls (trees) | <= 35 | GPU draw call overhead |
| Total scene verts | <= 2M | Mobile GPU fill rate |
| Template cache entries | <= 80 | RAM (each geometry ~10--100KB) |
| Template rebuild time | <= 200ms total | Season transition smoothness |
| Per-frame lerp updates | <= 200 trees | CPU budget for matrix writes |
| InstancedMesh count | <= 40 | WebGL uniform buffer limits |

### 11.6 Smooth Shading Note

All tree materials use `MeshStandardMaterial` with smooth shading for the modern Zelda-style aesthetic. This means:
- `computeVertexNormals()` on the merged geometry uses smooth normals for organic shapes
- PBR lighting responds naturally to scene lights
- The stylized low-poly silhouette provides whimsy while smooth shading keeps it modern and polished

### 11.7 Source File Mapping

| This Spec Section | Implementation File |
|-------------------|-------------------|
| Stage geometry | `game/utils/treeGeometry.ts` (existing, extend with stage-aware profiles) |
| Seasonal colors | `game/utils/treeGeometry.ts` (new: `applySeasonalColors()` function) |
| Template cache | New: `game/rendering/TemplateCache.ts` |
| Instance pool | New: `game/rendering/TreeInstancePool.ts` |
| R3F component | New: `game/rendering/TreeInstanceManager.tsx` |
| Seed/sprout geometry | New: `game/utils/seedSproutGeometry.ts` |
| Visual config | `config/game/species.json` (extend with `visualProfile`) |
| Growth animation | `game/ecs/archetypes.ts` (existing `getStageScale`) + render loop |
| Night glow | New: `game/rendering/NightEffects.ts` |
| Harvest indicator | New: `game/rendering/HarvestIndicator.tsx` |

---

## Appendix A: Quick-Reference Species Comparison Table

| Species | Trunk H | Trunk R | Canopy R | Forks | Boughs | Branches | Leaves | BowH | Shape | Deciduous |
|---------|---------|---------|----------|-------|--------|----------|--------|------|-------|-----------|
| White Oak | 1.8 | 0.15 | 0.9 | 3 | 2 | 8 | 5 | 2.0 | Round | Yes |
| Weeping Willow | 2.0 | 0.12 | 1.1 | 4 | 2 | 15 | 10 | 5.2 | Drooping | Yes |
| Elder Pine | 2.6 | 0.13 | 0.7 | 2 | 1 | 6 | 4 | 1.5 | Conical | No |
| Cherry Blossom | 1.6 | 0.10 | 1.0 | 3 | 2 | 10 | 9 | 2.5 | Spreading | Yes |
| Ghost Birch | 2.0 | 0.10 | 0.8 | 3 | 2 | 6 | 4 | 2.0 | Airy | Partial |
| Redwood | 3.5 | 0.20 | 1.0 | 3 | 2 | 10 | 5 | 2.0 | Columnar | No |
| Flame Maple | 2.0 | 0.14 | 1.1 | 4 | 2 | 10 | 6 | 2.5 | Spreading | Yes |
| Baobab | 2.5 | 0.30 | 1.3 | 4 | 1 | 4 | 3 | 1.0 | Bottle | Yes |
| Silver Birch | 2.0 | 0.10 | 0.85 | 3 | 2 | 6 | 4 | 2.0 | Airy | Yes |
| Ironbark | 2.4 | 0.22 | 0.9 | 2 | 1 | 6 | 4 | 1.5 | Conical | No |
| Golden Apple | 1.6 | 0.12 | 1.0 | 3 | 2 | 10 | 6 | 2.5 | Round | Yes |
| Mystic Fern | 0.8 | 0.08 | 1.2 | 3 | 2 | 8 | 8 | 1.5 | Flat spread | Yes |
| Crystal Oak | 2.2 | 0.18 | 1.0 | 3 | 2 | 8 | 6 | 2.0 | Broad | No |
| Moonwood Ash | 2.4 | 0.14 | 1.1 | 3 | 2 | 8 | 5 | 2.5 | Elegant | Yes |
| Worldtree | 3.5 | 0.35 | 1.5 | 5 | 2 | 15 | 8 | 2.0 | Dome | No |

## Appendix B: All Canopy Colors (Hex Quick Reference)

| Species | Spring | Summer | Autumn | Winter |
|---------|--------|--------|--------|--------|
| White Oak | `#6FCF73` | `#388E3C` | `#CC8833` | `#2B4F2E` |
| Weeping Willow | `#80E085` | `#66BB6A` | `#CC9933` | `#3D6640` |
| Elder Pine | `#267A2B` | `#1B5E20` | `#1F5022` | `#1A3F1D` |
| Cherry Blossom | `#F8B5CC` | `#F48FB1` | `#B86B88` | `#6B4D57` |
| Ghost Birch | `#C8D8E5` | `#B0BEC5` | `#B39068` | `#708090` |
| Redwood | `#3DA843` | `#2E7D32` | `#2A6B30` | `#1F4F24` |
| Flame Maple | `#F08040` | `#E65100` | `#E84020` | `#804030` |
| Baobab | `#73A842` | `#558B2F` | `#998844` | `#3D5A28` |
| Silver Birch | `#C0E8C2` | `#A5D6A7` | `#C49860` | `#4A7050` |
| Ironbark | `#267A2B` | `#1B5E20` | `#1A4F1C` | `#153F18` |
| Golden Apple | `#FFE88A` | `#FFD54F` | `#E8B030` | `#806830` |
| Mystic Fern | `#8AF5C5` | `#69F0AE` | `#60B880` | `#305840` |
| Crystal Oak | `#C39BD3` | `#80CBC4` | `#D4A843` | `#7EB3DB` |
| Moonwood Ash | `#C8B0E8` | `#B39DDB` | `#9070A8` | `#604870` |
| Worldtree | `#267A2B` | `#1B5E20` | `#1F5520` | `#1A4A1D` |

---

*End of Tree Species & Growth Visual System spec.*
