**Historical -- superseded by [`docs/plans/2026-03-07-unified-game-design.md`](plans/2026-03-07-unified-game-design.md) Section 7**
*The unified design contains the complete economy spec with 12 resources, forging, cooking, 28 recipes, expanded trading, and structure chains. This document is retained for historical reference.*

---

# Grovekeeper Economy, Crafting & Trading Design Document

**Status:** Superseded (2026-03-07). See unified-game-design.md Section 7.

Complete specification for the resource economy, crafting system, trading mechanics,
structure economy, seed economy, progression pacing, and economic events.

---

## Table of Contents

1. [Resource Flow Analysis](#1-resource-flow-analysis)
2. [Crafting Depth](#2-crafting-depth)
3. [Trading System Refinement](#3-trading-system-refinement)
4. [Structure Economy](#4-structure-economy)
5. [Seed Economy](#5-seed-economy)
6. [Progression Pacing](#6-progression-pacing)
7. [Economic Events](#7-economic-events)
8. [Balance Analysis](#8-balance-analysis)
9. [Config JSON Schemas](#9-config-json-schemas)

---

## 1. Resource Flow Analysis

### 1.1 The Four Resources

| Resource | Icon | Primary Source | Primary Sink | Role |
|----------|------|---------------|-------------|------|
| Timber | tree | White Oak, Elder Pine, Redwood, Ironbark, Baobab | Structures, grid expansion, tool upgrades, crafting | Building material, most abundant |
| Sap | droplet | Weeping Willow, Ghost Birch, Silver Birch, Moonwood Ash | Crafting (elixirs/tonics), tool upgrades, structures | Alchemical ingredient, mid-scarcity |
| Fruit | apple | Cherry Blossom, Flame Maple, Golden Apple, Baobab | Crafting (fertilizers), seed recipes, trading | Consumable, seasonal |
| Acorns | nut | Ghost Birch, Crystal Oak, Moonwood Ash | Seed crafting, grid expansion, prestige recipes | Currency-adjacent, late-game gated |

### 1.2 Expected Resources Per Session (15 minutes)

**Assumptions for a Level 10 player, summer season, 16x16 grid:**

- Grid capacity: 256 tiles, ~60% plantable = ~150 usable tiles
- Trees planted: ~40 trees on grid at various stages
- Mature+ trees (harvestable): ~15 trees
- Harvest cycles completed per 15 min: depends on species harvestCycleSec

**Per-harvest yields (base, no multipliers):**

| Species | Harvest Cycle (sec) | Harvests/15min | Yield/Harvest | Total/15min |
|---------|-------------------|----------------|---------------|-------------|
| White Oak | 45 | 20 | 2 timber | 40 timber |
| Weeping Willow | 60 | 15 | 3 sap | 45 sap |
| Elder Pine | 50 | 18 | 2 timber + 1 sap | 36 timber + 18 sap |
| Cherry Blossom | 75 | 12 | 2 fruit | 24 fruit |
| Ghost Birch | 55 | 16 | 2 sap + 1 acorn | 32 sap + 16 acorns |
| Redwood | 120 | 7 | 5 timber | 35 timber |
| Flame Maple | 90 | 10 | 3 fruit | 30 fruit |
| Silver Birch | 45 | 20 | 2 sap + 1 timber | 40 sap + 20 timber |
| Baobab | 150 | 6 | 2T + 2S + 2F | 12T + 12S + 12F |
| Ironbark | 100 | 9 | 4 timber | 36 timber |
| Golden Apple | 70 | 12 | 3 fruit | 36 fruit |

**Realistic mixed-grove session estimate (Level 10, ~15 mature trees, diverse species):**

```
Timber:  ~60-80 per session
Sap:     ~30-50 per session
Fruit:   ~20-35 per session
Acorns:  ~8-15 per session
```

**With multipliers (pruned 1.5x, Old Growth 1.5x, structure boost, season):**

```
Timber:  ~90-150 per session
Sap:     ~45-90 per session
Fruit:   ~30-60 per session
Acorns:  ~12-25 per session
```

### 1.3 Resource Sinks (What Consumes Each Resource)

#### Timber Sinks

| Sink | Amount | Frequency | Notes |
|------|--------|-----------|-------|
| Grid expansion (12->16) | 100 | Once | Level 5 gate |
| Grid expansion (16->20) | 250 | Once | Level 10 gate |
| Grid expansion (20->24) | 500 | Once | Level 15 gate |
| Grid expansion (24->32) | 1000 | Once | Level 20 gate |
| Tool upgrades (tier 1) | 20 | Per tool (12 tools) | 240 total |
| Tool upgrades (tier 2) | 40 | Per tool | 480 total |
| Tool upgrades (tier 3) | 80 | Per tool | 960 total |
| Well | 30 | Per structure | Repeatable |
| Tool Shed | 50 | Per structure | Repeatable |
| Greenhouse | 100 | Per structure | Repeatable |
| Market Stall | 40 | Per structure | Repeatable |
| Wooden Fence | 5 | Per structure | Cheap decorative |
| Bench | 15 | Per structure | Decorative |
| Tier 1 recipes | 6-8 | Per craft | Repeatable |
| Tier 2 recipes | 5-15 | Per craft | Repeatable |
| Tier 3 recipes | 15-25 | Per craft | Repeatable |
| Tier 4 recipes | 15-50 | Per craft | Repeatable |
| Trading (acorns->timber) | -- | Player sells | Circular |

**Total one-time timber sinks: ~3,530 (all grids + all tool upgrades)**
**Recurring sinks: structures, crafting, trading**

#### Sap Sinks

| Sink | Amount | Frequency |
|------|--------|-----------|
| Grid expansion (12->16) | 50 | Once |
| Grid expansion (16->20) | 100 | Once |
| Grid expansion (20->24) | 250 | Once |
| Grid expansion (24->32) | 500 | Once |
| Tool upgrades (tier 1) | 10 | Per tool |
| Tool upgrades (tier 2) | 20 | Per tool |
| Tool upgrades (tier 3) | 40 | Per tool |
| Well | 20 | Per structure |
| Tool Shed | 20 | Per structure |
| Greenhouse | 50 | Per structure |
| Trading Post | 20 | Per structure |
| Tier 1-4 recipes | 4-40 | Per craft |

**Total one-time sap sinks: ~1,740**

#### Fruit Sinks

| Sink | Amount | Frequency |
|------|--------|-----------|
| Grid expansion (16->20) | 50 | Once |
| Grid expansion (20->24) | 100 | Once |
| Grid expansion (24->32) | 250 | Once |
| Tool upgrades (tier 2) | 10 | Per tool |
| Tool upgrades (tier 3) | 20 | Per tool |
| Greenhouse | 30 | Per structure |
| Forge | 30 | Per structure |
| Grand Market | 30 | Per structure |
| Tier 1-4 recipes | 3-30 | Per craft |

**Total one-time fruit sinks: ~760**

#### Acorn Sinks

| Sink | Amount | Frequency |
|------|--------|-----------|
| Grid expansion (20->24) | 50 | Once |
| Grid expansion (24->32) | 100 | Once |
| Tool upgrades (tier 3) | 10 | Per tool |
| Market Stall | 15 | Per structure |
| Trading Post | 30 | Per structure |
| Grand Market | 60 | Per structure |
| Biodome | 50 | Per structure |
| Tier 1-4 recipes | 3-40 | Per craft |

**Total one-time acorn sinks: ~390**

### 1.4 Resource Balance Assessment

**FINDING: Acorns are under-sourced relative to demand.**

- Only 3 base species produce acorns: Ghost Birch (1/harvest), Crystal Oak (5, prestige), Moonwood Ash (2, prestige)
- Acorn demand ramps heavily in late game (grid expansion, Tier 3-4 recipes, structures)
- This is INTENTIONAL -- acorns serve as the late-game bottleneck resource, creating trading pressure

**FINDING: Timber is over-produced in mid-game.**

- 5 species produce timber, White Oak is the starter species
- Grid expansion is the primary sink, but has finite demand
- Structures provide repeatable sinks but players build few
- MITIGATION: Trading system converts timber surplus into other resources. Structure upgrade chains consume large amounts.

**FINDING: Fruit has strong seasonal variance.**

- Cherry Blossom, Flame Maple, Golden Apple all suffer winter dormancy (0 growth)
- Autumn is the fruit windfall season (Golden Apple 3x, Flame Maple 2x)
- This creates seasonal trading patterns -- store fruit in autumn, trade in winter

### 1.5 Resource Flow Diagram

```
                    SOURCES                          SINKS
                    -------                          -----

  [White Oak]----+                          +--->[Grid Expansion]
  [Elder Pine]---+-->[TIMBER]--+            |
  [Redwood]------+     |       +-->[CRAFT]--+--->[Structures]
  [Ironbark]-----+     |       |            |
  [Baobab]-------+     +-------+-->[TRADE]--+--->[Tool Upgrades]
                       |       |            |
  [Weeping Willow]+    |       |            +--->[Recipes]
  [Ghost Birch]---+-->[SAP]----+
  [Silver Birch]--+    |
  [Moonwood Ash]--+    |
  [Mystic Fern]---+    |
                       |
  [Cherry Blossom]+    |
  [Flame Maple]---+-->[FRUIT]--+
  [Golden Apple]--+    |       |
  [Baobab]--------+   |       +-->[Seed Crafting]
                       |       |
  [Ghost Birch]---+    |       +-->[Trading for Acorns]
  [Crystal Oak]---+-->[ACORNS]-+
  [Moonwood Ash]--+            |
                               +-->[Late-game Recipes]
                               |
                               +-->[Grid Expansion 20+]

  Cross-cutting sinks: Traveling Merchant purchases, Festival challenges
  Cross-cutting sources: Quest rewards, Encounter rewards, Festival rewards
```

### 1.6 Progression Gates by Level Tier

| Level | Gate | Cost | Expected Sessions to Afford |
|-------|------|------|---------------------------|
| 1-5 | Grid 12->16 | 100T, 50S | ~3-4 sessions |
| 5-10 | First structure (Well) | 30T, 20S | ~1 session |
| 5-10 | Tool upgrades (3 tools, tier 1) | 60T, 30S | ~2 sessions |
| 10-15 | Grid 16->20 | 250T, 100S, 50F | ~4-5 sessions |
| 10-15 | Greenhouse | 100T, 50S, 30F | ~2 sessions |
| 15-20 | Grid 20->24 | 500T, 250S, 100F, 50A | ~6-8 sessions |
| 20-25 | Grid 24->32 | 1000T, 500S, 250F, 100A | ~10-12 sessions |
| 25+ | Tier 4 recipes | 25-50 each resource | ~1-2 sessions per craft |

---

## 2. Crafting Depth

### 2.1 Complete Recipe Table

#### Tier 1 -- Basic (Levels 1-5)

| # | ID | Name | Inputs | Outputs | Level | Structure? | Design Intent |
|---|-----|------|--------|---------|-------|-----------|---------------|
| 1 | refine-timber | Wooden Plank | 8 timber | 4 sap | 1 | No | Resource conversion, teaches crafting |
| 2 | simple-fertilizer | Simple Fertilizer | 5 fruit, 3 acorns | Growth +15% / 120s | 2 | No | Introduces effect crafting |
| 3 | seed-pouch | Seed Pouch | 10 acorns | 3 seeds (oak/pine/willow) | 2 | No | Seed acquisition path |
| 4 | basic-tonic | Basic Tonic | 5 sap, 3 fruit | Stamina +30 (instant) | 3 | No | Stamina management |
| 5 | bark-mulch | Bark Mulch | 6 timber, 4 sap | Growth +10% / 180s | 4 | No | Weaker but longer fertilizer |
| 6 | fruit-preserve | Fruit Preserve | 8 fruit | 12 acorns | 5 | No | Fruit->acorn conversion |

#### Tier 2 -- Intermediate (Levels 6-10)

| # | ID | Name | Inputs | Outputs | Level | Structure? | Design Intent |
|---|-----|------|--------|---------|-------|-----------|---------------|
| 7 | sturdy-plank | Sturdy Plank | 15 timber, 5 sap | 8 sap, 25 XP | 6 | No | Better conversion + XP bonus |
| 8 | growth-elixir | Growth Elixir | 10 sap, 8 fruit | Growth +35% / 180s | 7 | No | Strong growth accelerant |
| 9 | weather-charm | Weather Charm | 12 acorns, 8 sap | Rain Call / 300s | 7 | No | Weather control |
| 10 | pruning-oil | Pruning Oil | 8 sap, 5 timber | Harvest +25% / 240s | 8 | No | Yield boosting |
| 11 | seed-bundle | Seed Bundle | 15 acorns, 10 fruit | 5 seeds (cherry/ghost/silver) | 9 | No | Rare species seeds |
| 12 | compost-heap | Compost Heap | 10 timber, 10 fruit | Growth +20% / 600s | 10 | Trading Post | Long-duration, structure-gated |

#### Tier 3 -- Advanced (Levels 11-18)

| # | ID | Name | Inputs | Outputs | Level | Structure? | Design Intent |
|---|-----|------|--------|---------|-------|-----------|---------------|
| 13 | hardwood-beam | Hardwood Beam | 25 timber, 10 sap | 15 acorns | 11 | Trading Post | Timber->acorn conversion |
| 14 | essence-of-growth | Essence of Growth | 20 sap, 15 fruit, 10 acorns | Growth +50% / 300s | 13 | No | Premium growth boost |
| 15 | storm-shield | Storm Shield | 20 acorns, 15 timber | Weather Protection / 600s | 14 | No | Storm insurance |
| 16 | ancient-fertilizer | Ancient Fertilizer | 15 each (sap, fruit, timber) | Growth +60% / 420s | 15 | No | Best non-permanent fertilizer |
| 17 | rare-seed-kit | Rare Seed Kit | 25 acorns, 20 fruit | 3 seeds (redwood/flame/ironbark) | 16 | No | Late-game species seeds |
| 18 | master-tonic | Master Tonic | 15 sap, 10 fruit, 10 timber | Stamina +100 (full restore) | 18 | No | Full stamina recovery |

#### Tier 4 -- Master (Levels 19-25+)

| # | ID | Name | Inputs | Outputs | Level | Structure? | Design Intent |
|---|-----|------|--------|---------|-------|-----------|---------------|
| 19 | worldtree-sap | Worldtree Sap | 40 sap, 30 timber, 20 fruit | 50 acorns, 100 XP | 19 | No | Massive conversion + XP |
| 20 | eternal-fertilizer | Eternal Fertilizer | 35 sap, 25 fruit, 25 acorns | Permanent Growth +25% (1 tree) | 20 | No | Permanent single-tree boost |
| 21 | forest-heart | Forest Heart | 50 timber, 30 sap, 20 acorns | 25 timber, 25 sap, 150 XP | 21 | No | Resource transmutation + XP |
| 22 | alchemists-brew | Alchemist's Brew | 30S, 25F, 15T, 15A | All Resources 2x / 300s | 22 | No | Ultimate harvest window |
| 23 | ancient-seed | Ancient Seed | 40A, 30F, 20S | 1 prestige seed | 23 | No | Prestige species access |
| 24 | grove-blessing | Grove Blessing | 25 each (all 4) | XP 2x / 1440s (24 min) | 25 | No | XP acceleration |

### 2.2 Recipe Review and Assessment

**Are they meaningful? Do players WANT to craft them?**

| Category | Count | Assessment |
|----------|-------|-----------|
| Resource Conversion | 5 | YES -- critical for converting surplus to deficit resources |
| Growth Boosters | 6 | YES -- directly accelerates core loop, tiered progression feels good |
| Stamina Recovery | 2 | YES -- extends play sessions, Basic Tonic at L3 is well-timed |
| Seed Acquisition | 4 | YES -- primary path to rare species, strong motivation |
| Harvest Boosters | 2 | YES -- synergizes with seasonal timing for max yield windows |
| Weather Control | 2 | GOOD -- Rain Call is powerful (growth boost), Storm Shield prevents loss |
| XP Boosters | 2 | YES -- late-game XP grind makes these valuable |
| Permanent Effects | 1 | YES -- Eternal Fertilizer is the aspirational endgame craft |
| Combined Effects | 1 | YES -- Alchemist's Brew is the "big moment" craft |

**Identified Gaps (recipes that should exist but do not):**

1. **No "auto-water" consumable** -- Players manually water trees; a craftable auto-water effect would be popular
2. **No structure repair/upgrade recipe** -- Structures have upgrade chains but no crafted upgrade catalyst
3. **No cosmetic recipes** -- No way to craft decorative items (flower garlands, lanterns)
4. **No multi-step recipe chains** -- Every recipe is atomic; no "craft A, then use A to craft B"

### 2.3 Recommended New Recipes

These fill gaps without inflating the recipe count excessively. Add 4 recipes (total: 28).

| ID | Name | Tier | Level | Inputs | Outputs | Rationale |
|----|------|------|-------|--------|---------|-----------|
| dewdrop-vial | Dewdrop Vial | 2 | 8 | 6 sap, 4 fruit | Auto-water all trees in zone / 300s | Addresses watering tedium mid-game |
| builders-catalyst | Builder's Catalyst | 3 | 12 | 20 timber, 15 sap, 10 acorns | Unlocks structure upgrade (consume on upgrade) | Gives structure upgrades a resource cost beyond just materials |
| grove-lantern | Grove Lantern | 2 | 9 | 8 timber, 6 sap | Decorative placeable, +5% XP in 2-tile radius | Cosmetic with minor bonus |
| ancient-compost | Ancient Compost | 3 | 15 | Bark Mulch effect active + 15S, 10A | Growth +40% / 600s, requires Bark Mulch active | First recipe chain (must craft Bark Mulch first) |

### 2.4 Recipe Categories

```
RECIPES
  |
  +-- Conversion (resource -> resource)
  |     refine-timber, fruit-preserve, sturdy-plank, hardwood-beam,
  |     worldtree-sap, forest-heart
  |
  +-- Growth Boosters (temporary growth acceleration)
  |     simple-fertilizer, bark-mulch, growth-elixir, compost-heap,
  |     essence-of-growth, ancient-fertilizer
  |
  +-- Harvest Boosters (temporary yield increase)
  |     pruning-oil, alchemists-brew
  |
  +-- Stamina Recovery (instant stamina restore)
  |     basic-tonic, master-tonic
  |
  +-- Weather Control (rain/protection)
  |     weather-charm, storm-shield
  |
  +-- Seed Acquisition (obtain seeds)
  |     seed-pouch, seed-bundle, rare-seed-kit, ancient-seed
  |
  +-- XP Boosters (XP multiplier)
  |     grove-blessing
  |
  +-- Permanent Effects (one-time permanent boost)
  |     eternal-fertilizer
  |
  +-- [NEW] Utility (quality-of-life)
  |     dewdrop-vial, builders-catalyst
  |
  +-- [NEW] Cosmetic-Hybrid (decorative + minor bonus)
        grove-lantern
```

### 2.5 Crafting UI Flow

**Access Point: Workbench interaction OR Pause Menu > Crafting tab**

Players interact with crafting via:

1. **Quick Craft** -- Tap the Crafting icon in the tool belt (always available). Opens a scrollable list filtered by unlocked level. Items with insufficient resources are grayed out with missing amounts shown in red.

2. **Structure-Gated Craft** -- Recipes requiring a structure (e.g., `compost-heap` requires Trading Post) show a lock icon with "Requires: Trading Post" when the player has no such structure. If they have the structure, recipes are available in Quick Craft regardless of proximity (the structure exists in the world).

3. **UI Layout (Mobile Portrait)**:
```
+----------------------------------+
|  [X]  CRAFTING           [Tier v]|
|  --------------------------------|
|  [Basic] [Inter] [Adv] [Master]  |  <-- tier tabs
|  --------------------------------|
|  +------------------------------+|
|  | [icon] Seed Pouch            ||
|  | 10 Acorns -> 3 Seeds         ||
|  | [====CRAFT====]              ||
|  +------------------------------+|
|  | [icon] Basic Tonic     [NEW] ||
|  | 5 Sap + 3 Fruit -> +30 Stam ||
|  | [====CRAFT====]              ||
|  +------------------------------+|
|  | [icon] Bark Mulch    [LOCKED]||
|  | Need: 2 more sap             ||
|  | [----CRAFT----]  (grayed)    ||
|  +------------------------------+|
+----------------------------------+
```

4. **Craft Confirmation** -- Tap CRAFT shows a brief confirmation: "Craft Basic Tonic? Uses 5 Sap + 3 Fruit". Tap "Confirm" or "Cancel". No accidental crafts.

### 2.6 Crafting Animations

When a craft completes:

1. **Resource particles fly from the input counts toward center** (0.5s)
2. **Central glow pulse** -- white-gold expanding ring (0.3s)
3. **Output item/effect icon bounces into view** with sparkle trail (0.3s)
4. **Toast notification** -- "+30 Stamina" or "3 Seeds Added" (auto-dismiss 2s)
5. **Haptic feedback** -- medium impact on mobile (via Capacitor)

Total animation: ~1.1 seconds. Skippable by tapping.

### 2.7 Recipe Chains and Discovery

**Recipe Chains (implemented via `requiredStructure` or new `requiredActiveEffect`):**

- Bark Mulch -> Ancient Compost (requires Bark Mulch effect active)
- Simple Fertilizer -> Growth Elixir -> Essence of Growth (each unlocks at higher levels, not chained but thematically progressive)
- Builder's Catalyst -> consumed when upgrading a structure

**Discovery Recipes:**
- Hidden recipes revealed when the player first acquires a specific combination of resources
- Example: Having 50+ acorns for the first time reveals the "Seed Pouch" recipe with a "Recipe Discovered!" toast
- All 24 base recipes are eventually discoverable through normal play by level 10

---

## 3. Trading System Refinement

### 3.1 Base Trade Rates

Current implementation (circular chain with intentional friction):

```
Timber (10) --> Sap (5)      [2:1 ratio]
Sap (10)    --> Fruit (3)    [3.3:1 ratio]
Fruit (15)  --> Acorns (5)   [3:1 ratio]
Acorns (20) --> Timber (10)  [2:1 ratio]
```

**Circular trade loss analysis:**
Starting with 100 Timber:
- 100 Timber -> 50 Sap
- 50 Sap -> 15 Fruit
- 15 Fruit -> 5 Acorns
- Would need 20 Acorns for 10 Timber (insufficient)

This confirms: **no profitable circular arbitrage exists.** Each full loop loses ~90% of value. The system is trade-for-need, not trade-for-profit.

### 3.2 Effective Pricing with All Modifiers

```
effectiveRate = baseRate * seasonalModifier * supplyDemandMultiplier * marketEventModifier
```

**Seasonal Modifiers** (from `seasonalMarket.ts`):

| Season | Timber | Sap | Fruit | Acorns |
|--------|--------|-----|-------|--------|
| Spring | 1.0 | 1.2 | 0.8 | 1.0 |
| Summer | 0.8 | 1.0 | 1.2 | 1.0 |
| Autumn | 1.2 | 0.8 | 1.5 | 1.3 |
| Winter | 1.5 | 0.6 | 0.5 | 1.5 |

**Supply/Demand** (from `supplyDemand.ts`):
- Formula: `multiplier = 1.0 + (buyVolume - sellVolume) / 100`
- Clamped to [0.5, 2.5]
- 30-day rolling window
- Selling pressure lowers price; buying pressure raises it

**Market Events** (from `marketEvents.ts`):

| Event | Duration | Effects |
|-------|----------|---------|
| Timber Boom | 5 days | Timber 2.0x |
| Sap Shortage | 4 days | Sap 2.5x |
| Fruit Festival | 6 days | Fruit 1.5x |
| Acorn Rush | 3 days | Acorns 2.0x |
| Merchant Holiday | 5 days | All 0.7x |
| Rare Influx | 4 days | All 1.5x |

**Best-case trade scenario:**
- Sell timber during Timber Boom + Winter + high buy pressure
- Effective multiplier: 2.0 (event) * 1.5 (season) * 2.5 (supply/demand) = 7.5x
- This is extreme and self-correcting (selling pressure drops the price)

### 3.3 NPC Merchant Personalities

The existing Traveling Merchant is personality-agnostic. The NPC system has 6 NPCs with distinct roles. Here is how trading personalities should map:

| NPC | Role | Trading Specialty | Rate Modifier |
|-----|------|-------------------|--------------|
| Hazel | Trader | General goods, best rates | -5% cost (loyalty discount after quest chain) |
| Elder Rowan | Lorekeeper | Rare seeds only, high prices | Seeds at 1.5x cost but exclusive species |
| Botanist Fern | Scientist | Sap and fruit trades | Sap/fruit trades at 10% better rate |
| Oakley | Carpenter | Timber trades, structure materials | Timber trades at 15% better rate |
| Blossom | Gardener | Seeds and fruit | Fruit->seed trades at better ratios |
| Bramble | Weatherman | Weather charms and protection | Sells weather-related recipes cheaper |

**Implementation:** NPC-specific trade rate modifiers are applied when the player trades near/with a specific NPC. This creates spatial value -- positioning near the right NPC matters.

### 3.4 Haggling vs Fixed Prices

**Design Decision: Fixed prices with dynamic modifiers (NO haggling mini-game).**

Rationale:
- 3-15 minute session target means no time for haggling interactions
- Dynamic pricing via seasons + supply/demand + events already creates decision depth
- Mobile-first: tap to trade, no fiddly price negotiation
- The "haggling" comes from TIMING -- selling during events or favorable seasons IS the skill

### 3.5 Trade History

**Visible to player:** Yes, in the Pause Menu > Economy tab.

```
+----------------------------------+
|  TRADE HISTORY                   |
|  --------------------------------|
|  Today (Day 15, Summer)          |
|  Sold 30 Timber -> 15 Sap       |
|  Bought 10 Fruit (15 Sap)       |
|  --------------------------------|
|  Yesterday (Day 14)              |
|  Sold 20 Sap -> 6 Fruit         |
|  --------------------------------|
|  PRICE TRENDS (30-day)           |
|  Timber: 1.2x [arrow up]        |
|  Sap:    0.8x [arrow down]      |
|  Fruit:  1.5x [arrow up]        |
|  Acorns: 1.0x [steady]          |
+----------------------------------+
```

### 3.6 Bulk Trading UI

```
+----------------------------------+
|  TRADE: Timber -> Sap            |
|  --------------------------------|
|  Rate: 10 Timber = 5 Sap        |
|  Season bonus: x1.2 (autumn)    |
|  --------------------------------|
|  Amount: [  30  ] [-] [+]       |
|  --------------------------------|
|  You spend: 30 Timber            |
|  You receive: 15 Sap             |
|  (x1.2 season = 18 Sap)         |
|  --------------------------------|
|  Your Timber: 87 -> 57           |
|  Your Sap:    12 -> 30           |
|  --------------------------------|
|  [====TRADE====]                 |
+----------------------------------+
```

- Slider or +/- buttons for amount (multiples of the base rate)
- Preview shows exact outcome including all modifiers
- Single tap to confirm

### 3.7 Exploit Loop Prevention

**Verified: No circular arbitrage is profitable.**

Additional safeguards:
1. **Supply/demand auto-corrects** -- Selling a resource drops its price, buying raises it. Repeated same-direction trades become increasingly unfavorable.
2. **Rolling 30-day window** -- Old trades decay, preventing permanent market manipulation.
3. **Multiplier clamp [0.5, 2.5]** -- Prevents infinite price spiral.
4. **Merchant quantity limits** -- Traveling Merchant offers have finite quantity per visit.
5. **Market event cooldown** -- 10 days between events prevents chaining favorable conditions.

---

## 4. Structure Economy

### 4.1 Structure Cost/Effect Table

#### Growth Boost Chain (Well -> Irrigation -> Sprinkler)

| Structure | Footprint | Cost | Level | Effect | Radius | Magnitude |
|-----------|-----------|------|-------|--------|--------|-----------|
| Well | 1x1 | 30T, 20S | 6 | Growth Boost | 2 tiles | +15% |
| Irrigation System | 2x2 | 60T, 40S | 12 | Growth Boost | 4 tiles | +25% |
| Sprinkler Network | 3x3 | 120T, 80S, 40F | 18 | Growth Boost | 6 tiles | +35% |

**Upgrade cost (cumulative):**
- Well -> Irrigation: 60T, 40S (pays for Irrigation minus Well refund? No -- you build the upgrade fresh and it replaces the old structure)
- Irrigation -> Sprinkler: 120T, 80S, 40F

#### Growth Boost Chain (Greenhouse -> Conservatory -> Biodome)

| Structure | Footprint | Cost | Level | Effect | Radius | Magnitude |
|-----------|-----------|------|-------|--------|--------|-----------|
| Greenhouse | 2x2 | 100T, 50S, 30F | 10 | Growth Boost | 4 tiles | +20% |
| Conservatory | 3x2 | 200T, 100S, 60F | 16 | Growth Boost | 5 tiles | +30% |
| Biodome | 3x3 | 400T, 200S, 120F, 50A | 22 | Growth Boost | 7 tiles | +40% |

#### Stamina Regen Chain (Tool Shed -> Workshop -> Forge)

| Structure | Footprint | Cost | Level | Effect | Radius | Magnitude |
|-----------|-----------|------|-------|--------|--------|-----------|
| Tool Shed | 2x1 | 50T, 20S | 5 | Stamina Regen | 3 tiles | +20% |
| Workshop | 2x2 | 100T, 40S | 11 | Stamina Regen | 4 tiles | +30% |
| Forge | 3x2 | 200T, 80S, 30F | 17 | Stamina Regen | 5 tiles | +40% |

#### Harvest Boost Chain (Market Stall -> Trading Post -> Grand Market)

| Structure | Footprint | Cost | Level | Effect | Radius | Magnitude |
|-----------|-----------|------|-------|--------|--------|-----------|
| Market Stall | 2x1 | 40T, 15A | 8 | Harvest Boost | 3 tiles | +30% |
| Trading Post | 2x2 | 80T, 30A, 20S | 14 | Harvest Boost | 4 tiles | +40% |
| Grand Market | 3x2 | 160T, 60A, 40S, 30F | 20 | Harvest Boost | 6 tiles | +50% |

#### Decorative Structures

| Structure | Footprint | Cost | Level | Effect |
|-----------|-----------|------|-------|--------|
| Wooden Fence | 1x1 | 5T | 3 | None (decorative) |
| Bench | 1x1 | 15T | 4 | None (decorative) |

### 4.2 Structure Effect Mechanics

**Growth Boost:** Multiplies the growth rate of all trees within the radius.
```
effectiveGrowthRate = baseGrowthRate * (1.0 + sum_of_growth_boost_magnitudes)
```
Multiple structures stack ADDITIVELY (not multiplicatively) to prevent exponential scaling.

**Harvest Boost:** Multiplies the yield of all harvests within the radius.
```
effectiveYield = baseYield * (1.0 + sum_of_harvest_boost_magnitudes)
```

**Stamina Regen:** Multiplies the stamina regeneration rate when the player is within the radius.
```
effectiveRegen = baseRegen * (1.0 + sum_of_stamina_regen_magnitudes)
```

**Stacking Cap:** Maximum total bonus from structures for any effect type is **+100%** (2x multiplier). This prevents degenerate strategies of filling the grid with structures.

### 4.3 Structure Placement Rules

1. **Grid-snapped** -- Structures snap to the tile grid (integer coordinates)
2. **No overlap** -- Structure footprints cannot overlap with other structures or trees
3. **No water tiles** -- Cannot place on water tiles
4. **No rock tiles** -- Cannot place on rock tiles (must clear first)
5. **Level requirement** -- Player must meet the `requiredLevel`
6. **Resource cost** -- Player must have sufficient resources

**Adjacent Requirements:** None in current implementation. Structures do not require adjacency to other structures or specific tile types. This keeps placement flexible on small grids.

### 4.4 Structure Upgrades

Current implementation uses an `upgradeTo` field on structure templates. When a player upgrades:

1. The old structure is removed
2. The new (upgraded) structure is placed in the same position
3. Player pays the FULL cost of the new structure (no refund for old)
4. Old structure effects are replaced by new structure effects

**Recommended Enhancement: Partial Refund**

When upgrading, refund 50% of the old structure's cost (rounded down):
```
upgradeNetCost = newStructureCost - floor(oldStructureCost * 0.5)
```

Example: Upgrading Well (30T, 20S) to Irrigation (60T, 40S):
- Refund: 15T, 10S
- Net cost: 45T, 30S

### 4.5 Structure Maintenance (Decay)

**Design Decision: No decay/repair mechanics.**

Rationale:
- Cozy game philosophy -- structures should feel like permanent progress
- 3-15 minute sessions leave no room for maintenance chores
- Decay would punish offline players, contradicting the idle-friendly design
- The upgrade chain itself provides the "maintenance" feel -- you improve, not just maintain

---

## 5. Seed Economy

### 5.1 Seed Acquisition Sources

| Source | Seeds Available | Cost/Requirement | Repeatability |
|--------|----------------|-----------------|---------------|
| Starting inventory | 10 White Oak | Free | Once (per prestige) |
| Level unlocks | Species auto-unlocked | Reach required level | Once per species |
| Crafting (Seed Pouch, T1) | 3x (oak/pine/willow) | 10 acorns | Repeatable |
| Crafting (Seed Bundle, T2) | 5x (cherry/ghost/silver) | 15A, 10F | Repeatable |
| Crafting (Rare Seed Kit, T3) | 3x (redwood/flame/ironbark) | 25A, 20F | Repeatable |
| Crafting (Ancient Seed, T4) | 1x (prestige species) | 40A, 30F, 20S | Repeatable |
| Traveling Merchant | Species-specific | Varies (15-40 resources) | Per visit |
| Quest rewards | Specific species | Complete quest steps | Once per quest |
| Festival rewards | Seasonal species | Complete festival challenges | Per festival |
| Encounter rewards | Random species | Player choice | Random |
| Wild tree harvest | Random chance of seed drop | Harvest wild trees | Random |

### 5.2 Seed Rarity Tiers

| Tier | Species | Unlock Method | Relative Scarcity |
|------|---------|--------------|-------------------|
| Common | White Oak | Start | Abundant (always available) |
| Common | Weeping Willow | Level 2 | Easy (low seed cost: 5 sap) |
| Common | Elder Pine | Level 3 | Easy (low seed cost: 5 timber) |
| Uncommon | Cherry Blossom | Level 5 | Moderate (8 fruit seed cost) |
| Uncommon | Ghost Birch | Level 6 | Moderate (6 sap + 2 acorns) |
| Uncommon | Silver Birch | Level 9 | Moderate (4 sap) |
| Rare | Redwood | Level 8 | Expensive (15 timber) |
| Rare | Flame Maple | Level 10 | Expensive (12 fruit) |
| Rare | Baobab | Level 12 | Very expensive (10T+10S+10F) |
| Rare | Ironbark | Level 14 | Expensive (12 timber) |
| Epic | Golden Apple | Level 18 | Expensive (10 fruit) |
| Epic | Mystic Fern | Level 22 | Expensive (8 sap + 4 fruit) |
| Legendary | Crystal Oak | Prestige 1 | 20 acorns + prestige gate |
| Legendary | Moonwood Ash | Prestige 2 | 15S + 10A + prestige gate |
| Legendary | Worldtree | Prestige 3 | 20 each resource + prestige gate |

### 5.3 Seed Cost Table (Planting Cost)

When planting a tree, the player spends 1 seed of that species PLUS the species' `seedCost` from resources:

| Species | Seed Cost (resources consumed on plant) |
|---------|---------------------------------------|
| White Oak | Free (no resource cost) |
| Weeping Willow | 5 sap |
| Elder Pine | 5 timber |
| Cherry Blossom | 8 fruit |
| Ghost Birch | 6 sap, 2 acorns |
| Redwood | 15 timber |
| Flame Maple | 12 fruit |
| Baobab | 10 timber, 10 sap, 10 fruit |
| Silver Birch | 4 sap |
| Ironbark | 12 timber |
| Golden Apple | 10 fruit |
| Mystic Fern | 8 sap, 4 fruit |
| Crystal Oak | 20 acorns |
| Moonwood Ash | 15 sap, 10 acorns |
| Worldtree | 20T, 20S, 20F, 20A |

### 5.4 Prestige Species Seeds

Prestige species are obtained through:

1. **Automatic unlock** -- When the player prestiges enough times, the species is added to `unlockedSpecies`
2. **Crafting** -- Ancient Seed recipe (Tier 4, Level 23): 40 acorns + 30 fruit + 20 sap = 1 random prestige seed
3. **Traveling Merchant** -- After merchant visit 5+, may offer prestige species seeds
4. **Quest rewards** -- Sage's lore quest chain rewards Mystic Fern seeds (not prestige, but rare)

**No prestige species seeds are available before first prestige.** The Ancient Seed recipe produces a random prestige seed from the pool of species the player has unlocked via prestige count.

### 5.5 Seed Storage

**Design Decision: Unlimited seed storage. No inventory cap.**

Rationale:
- Seeds are earned through effort (crafting, quests, purchasing)
- Limiting storage would create frustrating discard decisions
- The game is cozy -- hoarding seeds should feel good, not stressful
- The COST to plant (resource seed cost) is the real limiter, not inventory

Seeds are tracked as `Record<string, number>` in the game store -- a simple count per species.

---

## 6. Progression Pacing

### 6.1 XP Curve Formula

From `gameStore.ts`:

```typescript
function xpToNext(level: number): number {
  if (level < 1) return 100;
  return 100 + Math.max(0, (level - 2) * 50) + Math.floor((level - 1) / 5) * 200;
}
```

### 6.2 Complete XP Table (Levels 1-30)

| Level | XP to Next | Cumulative XP | XP/Session* | Sessions to Level |
|-------|-----------|---------------|-------------|-------------------|
| 1 | 100 | 0 | ~80 | 1.3 |
| 2 | 100 | 100 | ~90 | 1.1 |
| 3 | 150 | 200 | ~100 | 1.5 |
| 4 | 200 | 350 | ~110 | 1.8 |
| 5 | 450 | 550 | ~120 | 3.8 |
| 6 | 500 | 1,000 | ~140 | 3.6 |
| 7 | 550 | 1,500 | ~150 | 3.7 |
| 8 | 600 | 2,050 | ~160 | 3.8 |
| 9 | 650 | 2,650 | ~170 | 3.8 |
| 10 | 900 | 3,300 | ~180 | 5.0 |
| 11 | 950 | 4,200 | ~200 | 4.8 |
| 12 | 1,000 | 5,150 | ~210 | 4.8 |
| 13 | 1,050 | 6,150 | ~220 | 4.8 |
| 14 | 1,100 | 7,200 | ~230 | 4.8 |
| 15 | 1,550 | 8,300 | ~250 | 6.2 |
| 16 | 1,600 | 9,850 | ~260 | 6.2 |
| 17 | 1,650 | 11,450 | ~270 | 6.1 |
| 18 | 1,700 | 13,100 | ~280 | 6.1 |
| 19 | 1,750 | 14,800 | ~300 | 5.8 |
| 20 | 2,200 | 16,550 | ~320 | 6.9 |
| 21 | 2,250 | 18,750 | ~330 | 6.8 |
| 22 | 2,300 | 21,000 | ~340 | 6.8 |
| 23 | 2,350 | 23,300 | ~350 | 6.7 |
| 24 | 2,400 | 25,650 | ~360 | 6.7 |
| 25 | 2,850 | 28,050 | ~380 | 7.5 |
| 26 | 2,900 | 30,900 | ~400 | 7.3 |
| 27 | 2,950 | 33,800 | ~410 | 7.2 |
| 28 | 3,000 | 36,750 | ~420 | 7.1 |
| 29 | 3,050 | 39,750 | ~430 | 7.1 |
| 30 | 3,500 | 42,800 | ~440 | 8.0 |

*XP/Session estimates assume 15-minute sessions with mix of planting, watering, harvesting, quest completion, and crafting.

**Total sessions to level 25 (first prestige): ~115-130 sessions (~30-35 hours)**
**Total sessions to level 30: ~160-180 sessions (~40-45 hours)**

### 6.3 XP Sources

| Source | XP Amount | Frequency |
|--------|----------|-----------|
| Plant a tree | 5-15 (based on species difficulty) | Per plant |
| Water a tree | 2 | Per water |
| Prune a tree | 3 | Per prune |
| Tree reaches Sapling (stage 2) | 10 | Per tree |
| Tree reaches Mature (stage 3) | 20 | Per tree |
| Tree reaches Old Growth (stage 4) | 50 | Per tree |
| Harvest a tree | 5-10 | Per harvest |
| Discover a zone | 50 | Per zone |
| Complete quest step | 25-500 | Per step |
| Crafting (select recipes) | 25-150 | Per craft |
| Encounter choices | 30-200 | Per encounter |
| Festival completion | 175-250 | Per festival |
| Traveling Merchant (Almanac) | 50-150 | Per purchase |
| Level-up bonus | 0 (level IS the reward) | -- |

### 6.4 Level Tier Breakdown

#### Level 1-5: Tutorial Pace (Sessions 1-10)

**Player experience:** Learning the core loop. Everything feels new and rewarding.

- **Level 1:** Plant White Oak (free seeds), learn watering, first harvest. Unlock: Trowel, Watering Can.
- **Level 2:** Unlock Weeping Willow + Almanac. Learn about sap as a new resource. Quest: "Plant your first tree" (Rowan).
- **Level 3:** Unlock Elder Pine + Pruning Shears. First multi-resource tree. Learn pruning for harvest bonus.
- **Level 4:** Unlock Seed Pouch tool. Bench structure (decorative). Crafting introduces Bark Mulch.
- **Level 5:** Unlock Cherry Blossom + Shovel. Grid expansion available (12->16). Tool Shed structure. Major milestone -- world opens up.

**Economy at this tier:**
- Resources are tight but manageable
- Timber is the primary resource (most species produce it)
- Grid expansion at level 5 costs 100T + 50S -- first real "saving up" moment
- Seed Pouch recipe (10 acorns) teaches resource-to-seed conversion

#### Level 6-15: Mid-Game Depth (Sessions 10-60)

**Player experience:** Systems deepen. Trading becomes strategic. Multiple species to manage.

- **Level 6:** Ghost Birch (first acorn producer). Well structure.
- **Level 7:** Axe tool (chop old growth for timber burst). Weather Charm recipe (rain control).
- **Level 8:** Redwood (slow but massive timber). Market Stall structure (harvest boost).
- **Level 9:** Silver Birch (fast sap/timber). Seed Bundle recipe (rare species seeds).
- **Level 10:** Flame Maple + Compost Bin + Greenhouse. Major system unlock -- 3 new things at once.
- **Level 11-15:** Structures upgrade, Tier 3 recipes unlock, grid expands to 20x20.

**Economy at this tier:**
- All 4 resources in active production
- Trading becomes valuable (convert surplus timber to needed sap/fruit)
- Structure effects create spatial optimization puzzles
- Crafting provides meaningful resource sinks
- Traveling Merchant visits provide resource diversity

#### Level 16-25: Late-Game Mastery (Sessions 60-130)

**Player experience:** Optimization and specialization. Rare species. Prestige preparation.

- **Level 16-18:** Scarecrow, Golden Apple, Sprinkler Network. Master Tonic recipe.
- **Level 19-20:** Grafting Tool (combine species yields). Grid expands to 24x24. Tier 4 recipes unlock.
- **Level 21-24:** Mystic Fern (growth synergy species). Biodome. Ancient Seed recipe.
- **Level 25:** PRESTIGE UNLOCKS. All Tier 4 recipes available. Grove Blessing.

**Economy at this tier:**
- Resources flow freely -- the challenge is ALLOCATION not acquisition
- Acorns become the bottleneck (needed for Tier 4 recipes and grid expansion)
- Seasonal market timing matters (sell timber in winter at 1.5x, buy fruit in summer at 0.8x)
- Eternal Fertilizer (permanent boost) becomes the aspirational goal
- Players choose between "spend now" (crafting) vs "save for prestige"

#### Level 25+: Prestige Loop (Sessions 130+)

**What resets:**
- Level -> 1
- XP -> 0
- Trees planted/harvested/watered/matured counts -> 0
- Resources -> 0 (all types)
- Seeds -> 10 White Oak (+ prestige milestone bonuses)
- Grid size -> 12
- Unlocked tools -> Trowel + Watering Can only (unless Prestige 3+)
- Unlocked species -> White Oak + earned prestige species
- Placed structures -> removed
- Market/merchant/event state -> reset

**What persists:**
- Achievements
- Seasons experienced
- Lifetime resources
- Species progress (codex)
- Quest chain state
- Prestige count
- Prestige cosmetics

**Prestige incentives:**

| Prestige # | Growth Speed | XP Mult | Stamina Bonus | Harvest Yield | New Species | New Cosmetic |
|-----------|-------------|---------|--------------|--------------|-------------|-------------|
| 1 | 1.1x | 1.1x | +10 | 1.05x | Crystal Oak | Stone Wall |
| 2 | 1.2x | 1.2x | +20 | 1.10x | Moonwood Ash | Flower Hedge |
| 3 | 1.35x | 1.3x | +30 | 1.20x | Worldtree | Fairy Lights |
| 4 | 1.40x | 1.35x | +35 | 1.25x | -- | Crystal Boundary |
| 5 | 1.45x | 1.40x | +40 | 1.30x | -- | Ancient Runes |
| 6+ | +0.05/pres | +0.05/pres | +5/pres | +0.05/pres | -- | -- |

**Prestige milestones (from prestige.json):**

| Prestige | Bonus |
|----------|-------|
| 1 | 20 starting seeds (up from 10) |
| 2 | Start with a free Well structure |
| 3 | All tools unlocked at start |
| 4+ | 50 of each resource per prestige beyond 3 |

**Speed comparison:**
- First playthrough to Level 25: ~130 sessions
- Prestige 1 to Level 25: ~105 sessions (1.1x XP + 1.1x growth)
- Prestige 2 to Level 25: ~85 sessions (1.2x XP + 1.2x growth + free Well)
- Prestige 3 to Level 25: ~65 sessions (1.3x XP + 1.35x growth + all tools)

Each prestige makes the next run noticeably faster, incentivizing continued play.

---

## 7. Economic Events

### 7.1 Market Events (Existing)

From `marketEvents.ts`:

- **Frequency:** 15% chance per day, checked after 10-day cooldown
- **Duration:** 3-6 days depending on event
- **One active at a time**
- **Deterministic RNG** (seeded from world seed + day number)

| Event | Duration | Effect | Player Response |
|-------|----------|--------|----------------|
| Timber Boom | 5 days | Timber 2.0x | SELL timber, CRAFT timber-consuming recipes |
| Sap Shortage | 4 days | Sap 2.5x | SELL sap if surplus, otherwise protect stock |
| Fruit Festival | 6 days | Fruit 1.5x | SELL fruit; longest duration for sustained sales |
| Acorn Rush | 3 days | Acorns 2.0x | SELL acorns if surplus; short window, act fast |
| Merchant Holiday | 5 days | All 0.7x | BUY everything cheap; stockpile for future |
| Rare Influx | 4 days | All 1.5x | SELL everything at premium; avoid buying |

### 7.2 Seasonal Festivals (Existing)

From `festivals.json`:

| Festival | Season | Trigger Day | Duration | Growth Boost | Harvest Boost | Challenges | Reward |
|----------|--------|-------------|----------|-------------|--------------|------------|--------|
| Spring Bloom | Spring | Day 5 | 7 days | 1.5x | 1.0x | Plant 10, Water 20, 3 Mature | 200 XP, 5 Cherry seeds |
| Summer Solstice | Summer | Day 10 | 5 days | 1.0x | 2.0x | Harvest 15, 2 Old Growth | 250 XP, 50T+30S+30F+20A |
| Harvest Moon | Autumn | Day 8 | 6 days | 1.25x | 1.75x | Collect 100 resources, Plant 8, Water 15 | 225 XP, 40A+25F, 3 Golden Apple seeds |
| Frostweave | Winter | Day 12 | 5 days | 1.0x | 1.25x | Water 25, Plant 5 evergreen | 175 XP, 30T+20S, 4 Elder Pine seeds |

### 7.3 Random Encounters (Existing)

From `encounters.json`:

| Encounter | Season | Min Level | Rarity | Choices |
|-----------|--------|-----------|--------|---------|
| Mysterious Traveler | Any | 3 | 15% | Trade 20T for 2 Flame Maple seeds / Share fruit for 100 XP / Decline |
| Golden Rain | Spring | 1 | 10% | 2x growth for 3 days / 25 acorns |
| Lost Seedling | Any | 5 | 12% | 3 Silver Birch seeds / 30 XP |
| Ancient Spirit | Autumn | 8 | 8% | 200 XP / 1.5x growth 5 days / 1 Ghost Birch seed |
| Wandering Bees | Summer | 2 | 20% | 20 fruit / 15 sap |
| Aurora Display | Winter | 4 | 10% | 150 XP / 1.75x growth 4 days |

- **Frequency:** Checked daily after 7-day cooldown
- **One active at a time**
- **Player must resolve (choose) before another can trigger**

### 7.4 Traveling Merchant (Existing)

From `travelingMerchant.ts`:

- **Visit interval:** 7-14 days (random)
- **Stay duration:** 2 days
- **Offer count:** 3 (visits 0-1), 4 (visits 2-3), 5 (visits 4+)
- **Quantity bonus:** +1 per 3 visits

**Offer categories:**

| Category | Templates | Min Visit | Example |
|----------|----------|-----------|---------|
| Resources | 4 | 0 | Timber Bundle (15A -> 20T) |
| Seeds | 3 | 2 | Mystery Seed Pouch (20A+10S -> 1 Silver Maple seed) |
| XP | 2 | 1 | Forester's Almanac (10T+5S -> 50 XP) |
| Recipe | 1 | 3 | Merchant's Recipe Scroll (30A+20F -> special recipe) |

### 7.5 Player Milestone Rewards

| Milestone | Reward Type | Amount |
|-----------|-----------|--------|
| Level up | Toast notification + unlock check | Varies (tools/species) |
| Achievement unlocked | Gold popup + bragging rights | 15 XP per achievement |
| Quest step complete | Resources + XP + seeds | 25-500 XP, varies resources |
| Quest chain complete | Major reward package | 100-500 XP, 15-50 resources, seeds |
| Festival complete | Title + resources + seeds + XP | 175-250 XP, resources, seeds |
| First prestige | Cosmetic + species + permanent bonuses | Crystal Oak + Stone Wall + 1.1x bonuses |
| Zone discovery | 50 XP | Fixed |

### 7.6 Recommended New Economic Events

| Event | Type | Trigger | Effect | Duration |
|-------|------|---------|--------|----------|
| Bountiful Harvest | Market Event | 15% daily roll (add to pool) | All harvest yields +50% | 4 days |
| Resource Drought | Market Event | 15% daily roll (add to pool) | All resource yields -30% | 3 days |
| Grand Merchant Caravan | Encounter | Level 12+, any season, 6% rarity | Merchant arrives with 8 offers (double normal), all 20% cheaper | 3-day stay |
| Seed Rain | Encounter | Spring, Level 5+, 8% rarity | 5 random seeds of unlocked species appear in inventory | Instant |
| Elder's Bounty | Encounter | Level 15+, any season, 5% rarity | Choose: 100 of any one resource OR 25 of each resource | Instant |

---

## 8. Balance Analysis

### 8.1 Degenerate Strategy Check

#### Strategy: "Timber Farm" (plant only White Oak, sell everything)

- White Oak: 2 timber/45s = 2.67 timber/min
- With 40 mature trees: ~107 timber/min
- In 15 min: ~1,600 timber
- Trade to sap: 800 sap (via 10:5 rate)
- Trade to fruit: 240 fruit
- Trade to acorns: 80 acorns

**Verdict: NOT degenerate.** Each conversion step loses ~50-67% of value. Timber surplus trades poorly into acorns (the bottleneck resource). Diverse groves are always more efficient. Supply/demand further penalizes single-resource flooding.

#### Strategy: "Prestige Rush" (minimize time to Level 25)

- Focus purely on XP-generating activities
- Plant high-difficulty species for more XP
- Craft XP recipes (Sturdy Plank: 25 XP, Forest Heart: 150 XP, Grove Blessing: 2x XP)
- Complete all quests and festivals

**Verdict: Working as intended.** XP is gated by resource production speed. You cannot craft XP recipes without first harvesting resources. The system naturally paces prestige runs.

#### Strategy: "Market Timer" (trade only during favorable events)

- Stockpile resources during neutral periods
- Sell during Timber Boom / Sap Shortage at 2-2.5x
- Buy during Merchant Holiday at 0.7x

**Verdict: Intentionally rewarding.** Players who pay attention to market conditions earn 2-3x more value. But events are rare (15% daily, 10-day cooldown = roughly 1 event per 67 days) and short (3-6 days). The advantage is real but not game-breaking.

#### Strategy: "Structure Stack" (place many structures for overlapping bonuses)

- Fill grid with Greenhouses for +20% growth each
- If 5 Greenhouses overlap a single tree: +100% growth (2x speed)

**Verdict: Self-limiting.** Each structure occupies grid tiles (2x2 = 4 tiles for Greenhouse). A 16x16 grid (256 tiles) with 5 Greenhouses loses 20 tiles of planting space. The opportunity cost of lost trees outweighs the bonus from fewer, faster trees. The +100% stacking cap (recommended above) prevents further abuse.

#### Strategy: "Infinite Acorn Loop" (Fruit Preserve + Seed Pouch exploit)

- Craft Fruit Preserve: 8 fruit -> 12 acorns
- Craft Seed Pouch: 10 acorns -> 3 seeds
- Remaining: 2 acorns profit per cycle... but seeds are not convertible back to fruit

**Verdict: NOT exploitable.** Seeds cannot be converted back to resources. The 2-acorn "profit" is actually a seed investment, not a free resource. No circular loop exists.

### 8.2 Resource Sink Sufficiency

| Resource | Total One-Time Sinks | Recurring Sinks | Assessment |
|----------|---------------------|----------------|-----------|
| Timber | ~3,530 | Structures, crafting, trading | SUFFICIENT -- timber is abundant but sinks are deep |
| Sap | ~1,740 | Crafting, trading, structures | SUFFICIENT -- sap is mid-scarcity with proportional sinks |
| Fruit | ~760 | Crafting, seed recipes, trading | SLIGHTLY LOW -- fruit sinks could be deeper. Recommend adding fruit cost to more structures. |
| Acorns | ~390 | Crafting, grid expansion, seed recipes | INTENTIONALLY SCARCE -- acorns are the bottleneck. Sinks exceed easy supply. |

### 8.3 Session-to-Session Engagement Hooks

| Hook | Mechanic | Frequency |
|------|---------|-----------|
| "My trees grew!" | Offline growth calculation | Every session |
| "The merchant is here!" | Traveling Merchant | Every 7-14 game-days |
| "A festival started!" | Seasonal festivals | ~4 per year cycle |
| "Market event!" | Price modifiers | Every ~67 game-days |
| "New quest step!" | Quest chain progression | Ongoing |
| "I can afford the expansion!" | Grid expansion gates | 4 milestone moments |
| "New species unlocked!" | Level-up unlocks | ~10 species unlock moments |
| "Encounter!" | Random encounters | Every ~14 game-days |
| "Prestige!" | Prestige reset | Once per full playthrough |

### 8.4 Known Balance Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Timber over-production mid-game | Low | Trading system + structure sinks absorb surplus |
| Acorn under-production early-game | Medium | By design -- acorns gate progression. Fruit Preserve recipe provides conversion path. |
| Fruit seasonal volatility (0 in winter) | Medium | Intentional seasonal pressure. Players learn to stockpile in autumn. |
| XP grind after level 20 | Medium | Tier 4 recipes grant 100-150 XP. Festival completion grants 175-250 XP. Prestige XP bonus helps on repeat runs. |
| New players confused by trading | Low | Hazel's quest chain teaches trading step-by-step. |
| Structure placement on small grids | Low | Structures available starting at Level 3 (fences). Meaningful structures start at Level 5-6 when grid is still 12x12. Players must be strategic -- this is the intent. |

---

## 9. Config JSON Schemas

### 9.1 Recipe Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "name", "description", "tier", "requiredLevel", "inputs", "outputs"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "tier": { "type": "integer", "minimum": 1, "maximum": 4 },
    "requiredLevel": { "type": "integer", "minimum": 1, "maximum": 30 },
    "inputs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "amount"],
        "properties": {
          "type": { "enum": ["timber", "sap", "fruit", "acorns"] },
          "amount": { "type": "integer", "minimum": 1 }
        }
      },
      "minItems": 1
    },
    "outputs": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "required": ["kind", "type", "amount"],
            "properties": {
              "kind": { "const": "resource" },
              "type": { "enum": ["timber", "sap", "fruit", "acorns"] },
              "amount": { "type": "integer", "minimum": 1 }
            }
          },
          {
            "type": "object",
            "required": ["kind", "speciesPool", "amount"],
            "properties": {
              "kind": { "const": "seed" },
              "speciesPool": { "type": "array", "items": { "type": "string" } },
              "amount": { "type": "integer", "minimum": 1 }
            }
          },
          {
            "type": "object",
            "required": ["kind", "effect", "magnitude", "durationSec"],
            "properties": {
              "kind": { "const": "effect" },
              "effect": {
                "enum": [
                  "growth_boost", "harvest_boost", "stamina_restore",
                  "weather_protection", "rain_call", "xp_multiplier",
                  "all_resources_double", "permanent_growth_boost",
                  "auto_water"
                ]
              },
              "magnitude": { "type": "number" },
              "durationSec": { "type": "number" }
            }
          },
          {
            "type": "object",
            "required": ["kind", "amount"],
            "properties": {
              "kind": { "const": "xp" },
              "amount": { "type": "integer", "minimum": 1 }
            }
          }
        ]
      },
      "minItems": 1
    },
    "craftTime": { "type": "number", "minimum": 0 },
    "requiredStructure": { "type": "string" },
    "requiredActiveEffect": { "type": "string" }
  }
}
```

### 9.2 Trade Rate Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["baseRates", "seasonalModifiers", "supplyDemand", "marketEvents"],
  "properties": {
    "baseRates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["from", "to", "fromAmount", "toAmount"],
        "properties": {
          "from": { "enum": ["timber", "sap", "fruit", "acorns"] },
          "to": { "enum": ["timber", "sap", "fruit", "acorns"] },
          "fromAmount": { "type": "integer", "minimum": 1 },
          "toAmount": { "type": "integer", "minimum": 1 }
        }
      }
    },
    "seasonalModifiers": {
      "type": "object",
      "required": ["spring", "summer", "autumn", "winter"],
      "patternProperties": {
        "^(spring|summer|autumn|winter)$": {
          "type": "object",
          "required": ["timber", "sap", "fruit", "acorns"],
          "properties": {
            "timber": { "type": "number" },
            "sap": { "type": "number" },
            "fruit": { "type": "number" },
            "acorns": { "type": "number" }
          }
        }
      }
    },
    "supplyDemand": {
      "type": "object",
      "required": ["windowDays", "scalingFactor", "minMultiplier", "maxMultiplier"],
      "properties": {
        "windowDays": { "type": "integer", "minimum": 1 },
        "scalingFactor": { "type": "integer", "minimum": 1 },
        "minMultiplier": { "type": "number" },
        "maxMultiplier": { "type": "number" }
      }
    },
    "marketEvents": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "icon", "description", "durationDays", "effects"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "icon": { "type": "string" },
          "description": { "type": "string" },
          "durationDays": { "type": "integer", "minimum": 1, "maximum": 10 },
          "effects": {
            "type": "object",
            "patternProperties": {
              "^(timber|sap|fruit|acorns)$": { "type": "number" }
            }
          }
        }
      }
    }
  }
}
```

### 9.3 Structure Template Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "name", "description", "icon", "blocks", "footprint", "cost", "requiredLevel"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "icon": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["blockId", "localX", "localY", "localZ", "rotation"],
        "properties": {
          "blockId": { "type": "string" },
          "localX": { "type": "number" },
          "localY": { "type": "number" },
          "localZ": { "type": "number" },
          "rotation": { "enum": [0, 90, 180, 270] }
        }
      }
    },
    "footprint": {
      "type": "object",
      "required": ["width", "depth"],
      "properties": {
        "width": { "type": "integer", "minimum": 1 },
        "depth": { "type": "integer", "minimum": 1 }
      }
    },
    "cost": {
      "type": "object",
      "patternProperties": {
        "^(timber|sap|fruit|acorns)$": { "type": "integer", "minimum": 0 }
      }
    },
    "requiredLevel": { "type": "integer", "minimum": 1 },
    "effect": {
      "type": "object",
      "required": ["type", "radius", "magnitude"],
      "properties": {
        "type": { "enum": ["growth_boost", "harvest_boost", "stamina_regen", "storage"] },
        "radius": { "type": "integer", "minimum": 1, "maximum": 10 },
        "magnitude": { "type": "number", "minimum": 0, "maximum": 1.0 }
      }
    },
    "upgradeTo": { "type": "string" }
  }
}
```

### 9.4 Species Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["base", "prestige"],
  "properties": {
    "base": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id", "name", "difficulty", "unlockLevel", "biome",
          "baseGrowthTimes", "yield", "harvestCycleSec", "seedCost",
          "special", "evergreen", "meshParams"
        ],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "difficulty": { "type": "integer", "minimum": 1, "maximum": 5 },
          "unlockLevel": { "type": "integer", "minimum": 1 },
          "biome": { "type": "string" },
          "baseGrowthTimes": {
            "type": "array",
            "items": { "type": "number" },
            "minItems": 5,
            "maxItems": 5
          },
          "yield": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["resource", "amount"],
              "properties": {
                "resource": { "enum": ["timber", "sap", "fruit", "acorns"] },
                "amount": { "type": "integer", "minimum": 1 }
              }
            }
          },
          "harvestCycleSec": { "type": "number", "minimum": 1 },
          "seedCost": {
            "type": "object",
            "patternProperties": {
              "^(timber|sap|fruit|acorns)$": { "type": "integer", "minimum": 0 }
            }
          },
          "special": { "type": "string" },
          "evergreen": { "type": "boolean" },
          "meshParams": { "type": "object" },
          "requiredPrestiges": { "type": "integer", "minimum": 1 }
        }
      }
    },
    "prestige": {
      "type": "array",
      "items": { "$ref": "#/properties/base/items" }
    }
  }
}
```

### 9.5 XP Curve Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["formula", "constants"],
  "properties": {
    "formula": {
      "type": "string",
      "description": "Human-readable formula",
      "const": "xpToNext(level) = 100 + max(0, (level - 2) * 50) + floor((level - 1) / 5) * 200"
    },
    "constants": {
      "type": "object",
      "properties": {
        "baseXp": { "const": 100 },
        "linearScaling": { "const": 50 },
        "linearStartLevel": { "const": 2 },
        "stepInterval": { "const": 5 },
        "stepBonus": { "const": 200 }
      }
    }
  }
}
```

### 9.6 Prestige Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["minLevel", "bonusTable", "scalingBeyond3", "cosmetics", "milestones"],
  "properties": {
    "minLevel": { "const": 25 },
    "bonusTable": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["growthSpeedMultiplier", "xpMultiplier", "staminaBonus", "harvestYieldMultiplier"],
        "properties": {
          "growthSpeedMultiplier": { "type": "number" },
          "xpMultiplier": { "type": "number" },
          "staminaBonus": { "type": "integer" },
          "harvestYieldMultiplier": { "type": "number" }
        }
      },
      "minItems": 3,
      "maxItems": 3
    },
    "scalingBeyond3": {
      "type": "object",
      "required": ["growthBase", "growthStep", "xpBase", "xpStep", "staminaBase", "staminaStep", "harvestBase", "harvestStep"],
      "properties": {
        "growthBase": { "type": "number" },
        "growthStep": { "type": "number" },
        "xpBase": { "type": "number" },
        "xpStep": { "type": "number" },
        "staminaBase": { "type": "integer" },
        "staminaStep": { "type": "integer" },
        "harvestBase": { "type": "number" },
        "harvestStep": { "type": "number" }
      }
    },
    "cosmetics": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "description", "prestigeRequired", "borderColor", "borderStyle"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "prestigeRequired": { "type": "integer", "minimum": 1 },
          "borderColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
          "borderStyle": { "type": "string" },
          "glowColor": { "type": "string" }
        }
      }
    },
    "milestones": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["prestigeLevel", "description", "bonusSeeds"],
        "properties": {
          "prestigeLevel": { "type": "integer", "minimum": 1 },
          "description": { "type": "string" },
          "bonusSeeds": { "type": "integer" },
          "bonusResources": {
            "type": "object",
            "patternProperties": {
              "^(timber|sap|fruit|acorns)$": { "type": "integer" }
            }
          },
          "freeStructure": { "type": "string" },
          "allToolsUnlocked": { "type": "boolean" }
        }
      }
    }
  }
}
```

### 9.7 Grid Expansion Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["cellSize", "defaultSize", "expansionTiers"],
  "properties": {
    "cellSize": { "const": 1 },
    "defaultSize": { "const": 12 },
    "expansionTiers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["size", "requiredLevel", "cost"],
        "properties": {
          "size": { "type": "integer", "minimum": 12, "maximum": 64 },
          "requiredLevel": { "type": "integer", "minimum": 1 },
          "cost": {
            "type": "object",
            "patternProperties": {
              "^(timber|sap|fruit|acorns)$": { "type": "integer", "minimum": 0 }
            }
          }
        }
      }
    }
  }
}
```

### 9.8 Tool Upgrade Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["tier", "staminaReduction", "effectBoost", "cost"],
    "properties": {
      "tier": { "type": "integer", "minimum": 1, "maximum": 3 },
      "staminaReduction": { "type": "number", "minimum": 0, "maximum": 1 },
      "effectBoost": { "type": "number", "minimum": 0 },
      "cost": {
        "type": "object",
        "patternProperties": {
          "^(timber|sap|fruit|acorns)$": { "type": "integer", "minimum": 0 }
        }
      }
    }
  },
  "minItems": 3,
  "maxItems": 3
}
```

---

## Appendix A: Quick Reference Formulas

### Growth Rate
```
progressPerSecond = (seasonMult * waterMult) / (baseTime * difficultyMult)
```
- seasonMult: spring 1.5, summer 1.0, autumn 0.8, winter 0.0 (evergreen 0.3, ghost birch 0.5)
- waterMult: watered 1.3, unwatered 1.0
- difficultyMult: 1=1.0, 2=1.2, 3=1.5, 4=2.0, 5=2.5

### Harvest Yield
```
yield = baseAmount * stageMult * prunedMult * speciesSpecialMult * structureBoostMult
```
- stageMult: stage 4 = 1.5, else 1.0
- prunedMult: pruned = 1.5, else 1.0
- speciesSpecialMult: Ironbark OG = 3.0, Golden Apple Autumn = 3.0, else 1.0
- structureBoostMult: 1.0 + sum of nearby harvest_boost magnitudes (capped at 2.0)

### XP to Next Level
```
xpToNext(level) = 100 + max(0, (level - 2) * 50) + floor((level - 1) / 5) * 200
```

### Effective Trade Price
```
effectivePrice = basePrice * seasonalModifier * supplyDemandMultiplier * marketEventModifier
```

### Supply/Demand Multiplier
```
multiplier = clamp(1.0 + (buyVolume - sellVolume) / 100, 0.5, 2.5)
```

### Stamina with Tool Upgrade
```
effectiveCost = max(1, round(baseCost * (1 - tierReduction)))
```
- Tier 1: -10%, Tier 2: -20%, Tier 3: -30%

### Prestige Bonus (beyond 3)
```
growthMult = 1.35 + 0.05 * (prestigeCount - 3)
xpMult = 1.30 + 0.05 * (prestigeCount - 3)
staminaBonus = 30 + 5 * (prestigeCount - 3)
harvestMult = 1.20 + 0.05 * (prestigeCount - 3)
```
