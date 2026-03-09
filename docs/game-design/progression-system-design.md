# Grovekeeper: Progression, Leveling, & Prestige System -- Complete Design

> **Partially superseded by:** [`docs/plans/2026-03-07-unified-game-design.md`](../plans/2026-03-07-unified-game-design.md) Section 9 (Progression, New Game+, & Achievements)
>
> **Key changes from this document:**
> - **Species unlocks are NOT level-gated.** They come from finding Grovekeepers in hedge labyrinths (Section 4). This document's unlock pacing table (species at levels 1-25) is replaced by a table of tools, recipes, structures, abilities, and base building unlocks -- no species.
> - **Prestige is replaced by New Game+ (NG+).** The old prestige loop (reset at L25, tiered bonuses) is replaced by: find all 14 Grovekeepers + defeat Worldroot = NG+ unlocks. NG+ transforms gameplay (base building, raids, difficulty escalation) rather than just resetting with multipliers.
> - **45 achievements** (up from the ~35 in this doc), including 5 secret achievements.
> - **25 XP sources** (up from ~5 in this doc) -- core actions, economy, quests, NPCs, and discovery all grant XP.
> - **Species Discovery Codex** concept from this document is preserved in unified Section 9 (5 tiers per species, 9 completion milestones).
> - **Seasonal milestones and tutorial system** from this document are preserved but tutorial is now an in-world experience (Section 12), not modal.
>
> This document retains **extensive unique detail** about XP curve math (levels 1-30 table), detailed achievement definitions, codex tier mechanics, seasonal milestone triggers, tutorial step-by-step sequences, and config JSON schemas. These supplement the unified doc and remain valuable for implementation.

This document is the authoritative design specification for all progression systems in Grovekeeper. It covers XP curves, unlock pacing, achievements, prestige, the species codex, seasonal milestones, and the tutorial system. Every formula, threshold, and reward is defined with exact numbers ready for implementation.

---

## Table of Contents

1. [XP Curve & Leveling](#1-xp-curve--leveling)
2. [Unlock Pacing](#2-unlock-pacing)
3. [Achievement System](#3-achievement-system)
4. [Prestige System](#4-prestige-system)
5. [Species Discovery Codex](#5-species-discovery-codex)
6. [Seasonal Milestones](#6-seasonal-milestones)
7. [Tutorial & Progressive Revelation](#7-tutorial--progressive-revelation)
8. [Config JSON Schemas](#8-config-json-schemas)

---

## 1. XP Curve & Leveling

### 1.1 XP Formula

The existing formula from `gameStore.ts` is retained with no changes, as it produces a well-paced curve:

```
xpToNext(level) = 100 + max(0, (level - 2) * 50) + floor((level - 1) / 5) * 200
```

This creates a gentle ramp with +200 XP step-ups every 5 levels (milestone bumps at 5, 10, 15, 20, 25).

### 1.2 XP Curve Table (Levels 1-30)

| Level | XP to Next | Cumulative XP | Approx. Session Count | Tier |
|-------|-----------|---------------|----------------------|------|
| 1 | 100 | 0 | 1 | Seedling |
| 2 | 100 | 100 | 1 | Seedling |
| 3 | 150 | 200 | 1-2 | Seedling |
| 4 | 200 | 350 | 2 | Seedling |
| 5 | 450 | 550 | 3-4 | Sprout |
| 6 | 300 | 1,000 | 4-5 | Sprout |
| 7 | 350 | 1,300 | 5-6 | Sprout |
| 8 | 400 | 1,650 | 6-7 | Sprout |
| 9 | 450 | 2,050 | 7-8 | Sprout |
| 10 | 900 | 2,500 | 10-12 | Sapling |
| 11 | 550 | 3,400 | 12-14 | Sapling |
| 12 | 600 | 3,950 | 14-15 | Sapling |
| 13 | 650 | 4,550 | 15-17 | Sapling |
| 14 | 700 | 5,200 | 17-19 | Sapling |
| 15 | 1,150 | 5,900 | 20-23 | Mature |
| 16 | 800 | 7,050 | 23-25 | Mature |
| 17 | 850 | 7,850 | 25-27 | Mature |
| 18 | 900 | 8,700 | 27-30 | Mature |
| 19 | 950 | 9,600 | 30-32 | Mature |
| 20 | 1,400 | 10,550 | 33-37 | Old Growth |
| 21 | 1,050 | 11,950 | 37-40 | Old Growth |
| 22 | 1,100 | 13,000 | 40-43 | Old Growth |
| 23 | 1,150 | 14,100 | 43-46 | Old Growth |
| 24 | 1,200 | 15,250 | 46-49 | Old Growth |
| 25 | 1,650 | 16,450 | 50-55 | Grand Keeper |
| 26 | 1,300 | 18,100 | 55-59 | Grand Keeper |
| 27 | 1,350 | 19,400 | 59-63 | Grand Keeper |
| 28 | 1,400 | 20,750 | 63-67 | Grand Keeper |
| 29 | 1,450 | 22,150 | 67-71 | Grand Keeper |
| 30 | 1,900 | 23,600 | 72-78 | Grand Keeper |

Session count assumes 3-15 minute sessions earning 25-50 XP per session (planting, watering, harvesting cycle).

### 1.3 XP Sources

All XP amounts are BASE values before multipliers. Applied multipliers: prestige XP multiplier, Cherry Blossom Beauty Aura (+10%), Flame Maple Beauty Aura (+10% at 2-tile range), festival boosts, and Grove Blessing recipe effect.

#### Core Actions

| Action | Base XP | Notes |
|--------|---------|-------|
| Plant a tree | 5 | Per tree planted |
| Water a tree | 2 | Per tree watered |
| Harvest a tree | 10 | Per tree harvested (any stage) |
| Harvest Old Growth | 25 | Bonus for harvesting stage 4 trees |
| Prune a tree | 3 | Per tree pruned |
| Clear a tile (shovel) | 5 | Per rock/obstacle cleared |
| Tree reaches Sapling (stage 2) | 8 | Automatic, triggered on growth tick |
| Tree reaches Mature (stage 3) | 15 | Automatic |
| Tree reaches Old Growth (stage 4) | 30 | Automatic |

#### Economy Actions

| Action | Base XP | Notes |
|--------|---------|-------|
| Craft a recipe (Tier 1) | 10 | Per craft |
| Craft a recipe (Tier 2) | 25 | Per craft |
| Craft a recipe (Tier 3) | 50 | Per craft |
| Craft a recipe (Tier 4) | 100 | Per craft |
| Complete a trade | 8 | Buy or sell at market |
| Purchase from merchant | 15 | Per merchant purchase |

#### Quest & Exploration

| Action | Base XP | Notes |
|--------|---------|-------|
| Complete quest chain step | Defined per step | See questChains.json; 25-500 XP |
| Discover a new zone | 50 | First visit to any zone |
| Complete festival | Defined per festival | 175-250 XP (see festivals.json) |
| Resolve encounter | 0 | Encounters give resources/seeds, not XP directly (some choices give XP) |

#### NPC Interaction

| Action | Base XP | Notes |
|--------|---------|-------|
| Talk to NPC (first time) | 10 | Per unique NPC, first conversation |
| Increase friendship tier | 25 | Each tier threshold crossed |
| Complete NPC quest chain | 50 | Bonus on top of step rewards |

#### Discovery

| Action | Base XP | Notes |
|--------|---------|-------|
| Species reaches Tier 1 (Discovered) | 15 | First planting of species |
| Species reaches Tier 2 (Studied) | 25 | First time reaching Mature |
| Species reaches Tier 3 (Mastered) | 40 | First time reaching Old Growth |
| Species reaches Tier 4 (Legendary) | 75 | 10th harvest of species |

### 1.4 Level Tier Names

| Level Range | Tier Name | Title Color |
|------------|-----------|-------------|
| 1-4 | Seedling | #8BC34A (light green) |
| 5-9 | Sprout | #4CAF50 (green) |
| 10-14 | Sapling | #2E7D32 (dark green) |
| 15-19 | Mature Keeper | #1B5E20 (forest green) |
| 20-24 | Old Growth | #FFB300 (amber) |
| 25-30 | Grand Keeper | #FF6F00 (deep amber) |

### 1.5 Level-Up Celebration

When a player levels up:

1. **Toast notification:** "Level [N]! -- [Tier Name]" with success styling (green background, sparkle icon)
2. **Floating particle:** "+1 LEVEL" rises from player position in gold text, 2x size of normal floating particles
3. **XP bar flash:** The XP bar flashes gold briefly (200ms) then refills from 0% toward the next level
4. **Sound cue:** A rising two-note chime (C5 to E5, 200ms)
5. **Haptic feedback:** Medium impact on supported devices
6. **Unlock notifications:** If species/tools unlock, each gets its own toast 300ms after the level toast, category "achievement" (purple background)
7. **Milestone levels (5, 10, 15, 20, 25):** Additional "Milestone!" banner across the top of the screen for 2 seconds with the new tier name

### 1.6 XP Display

- **XP Bar:** Persistent in HUD (bottom area). Shows current XP / XP needed. Fills left to right. Color matches current tier.
- **Floating numbers:** "+[N] XP" floats upward from the action location. Font size 14px, gold color (#FFD700), fade-out over 1.5 seconds, rises 60px.
- **Milestone indicator:** Small diamond markers on the XP bar at 25%, 50%, 75% of current level. Reaching each triggers a subtle pulse animation.

---

## 2. Unlock Pacing

### 2.1 Design Principles

- **Drip feed rule:** Never more than 2 consecutive levels without a new unlock
- **Category variety:** Alternate between species, tools, recipes, structures, and features so the player always encounters something different
- **Complexity ramp:** Early levels unlock simple, forgiving systems. Complex systems (trading, crafting, prestige) unlock later.
- **"What's next" hook:** The pause menu always shows the next 2 upcoming unlocks with silhouettes

### 2.2 Complete Unlock Table (Levels 1-25)

| Level | Species | Tools | Recipes | Structures | Features | Zones |
|-------|---------|-------|---------|------------|----------|-------|
| 1 | White Oak | Trowel, Watering Can | Refine Timber | -- | Planting, Watering, Grove (12x12) | Starting Grove |
| 2 | Weeping Willow | Almanac | Simple Fertilizer, Seed Pouch | -- | Species Inspection, Codex (basic) | -- |
| 3 | Elder Pine | Pruning Shears | Basic Tonic | Wooden Fence | Pruning, NPC: Botanist Fern | -- |
| 4 | -- | Seed Pouch | Bark Mulch | Bench | Seed Inventory, NPC: Blossom | -- |
| 5 | Cherry Blossom | Shovel | Fruit Preserve | Tool Shed | Grid Expansion (16x16), Tile Clearing, NPC: Oakley | Meadow |
| 6 | Ghost Birch | -- | Sturdy Plank | Well | Trading (basic), NPC: Thorn | Hollow |
| 7 | -- | Axe | Growth Elixir, Weather Charm | -- | Harvesting (full), Weather system visible | -- |
| 8 | Redwood | -- | Pruning Oil | Market Stall | NPC: Sage, Seasonal Market | Ancient Forest |
| 9 | Silver Birch | -- | Seed Bundle | -- | Traveling Merchant | -- |
| 10 | Flame Maple | Compost Bin | Compost Heap | Greenhouse | Grid Expansion (20x20), NPC: Ember, Festivals | Mountain Pass |
| 11 | -- | Rain Catcher | Hardwood Beam | Workshop | Tool Upgrades (tier 1) | -- |
| 12 | Baobab | -- | Irrigation System recipe | Irrigation System | Quest Chains (visible) | -- |
| 13 | -- | Fertilizer Spreader | Essence of Growth | -- | Market Events | -- |
| 14 | Ironbark | -- | Storm Shield | Trading Post | -- | Tundra Edge |
| 15 | -- | -- | Ancient Fertilizer | -- | Grid Expansion (24x24), Tool Upgrades (tier 2) | -- |
| 16 | -- | Scarecrow | Rare Seed Kit | Conservatory | -- | -- |
| 17 | -- | -- | -- | Forge | -- | Coastal Bluff |
| 18 | Golden Apple | -- | Master Tonic, Sprinkler recipe | Sprinkler Network | -- | -- |
| 19 | -- | -- | Worldtree Sap | -- | -- | -- |
| 20 | -- | Grafting Tool | Eternal Fertilizer | Grand Market | Grid Expansion (32x32), Tool Upgrades (tier 3) | Savanna |
| 21 | -- | -- | Forest Heart | -- | -- | -- |
| 22 | Mystic Fern | -- | Alchemist's Brew | Biodome | -- | Enchanted Grove |
| 23 | -- | -- | Ancient Seed | -- | -- | -- |
| 24 | -- | -- | -- | -- | Prestige Preview (shown in pause menu) | -- |
| 25 | (Prestige species) | -- | Grove Blessing | -- | PRESTIGE UNLOCKED | -- |

### 2.3 Drip Feed Verification

No consecutive level pair goes without an unlock:

- L1: Species + Tools + Recipe + Feature
- L2: Species + Tool + Recipes + Feature
- L3: Species + Tool + Recipe + Structure + Feature
- L4: Tool + Recipe + Structure + Feature
- L5: Species + Tool + Recipe + Structure + Features + Zone
- L6: Species + Recipe + Structure + Features + Zone
- L7: Tool + Recipes + Feature
- L8: Species + Recipe + Structure + Features + Zone
- L9: Species + Recipe + Feature
- L10: Species + Tool + Recipe + Structure + Features + Zone
- L11: Tool + Recipe + Structure + Feature
- L12: Species + Recipe + Structure + Feature
- L13: Tool + Recipe + Feature
- L14: Species + Recipe + Structure + Zone
- L15: Recipe + Features
- L16: Tool + Recipe + Structure
- L17: Structure + Zone
- L18: Species + Recipes + Structure
- L19: Recipe
- L20: Tool + Recipe + Structure + Features + Zone
- L21: Recipe
- L22: Species + Recipe + Structure + Zone
- L23: Recipe
- L24: Feature (prestige preview)
- L25: Species + Recipe + Feature (prestige)

Every level has at least one unlock. The gap-prone range (15-25) is filled with recipes, structures, and zone access.

### 2.4 Unlock Notification Design

When a new item unlocks:

- **Toast type:** "achievement" (purple background, star icon)
- **Content:** "Unlocked: [Item Name]" with a small icon of the item type (species leaf, tool icon, recipe scroll, structure block)
- **Duration:** 3 seconds, auto-dismiss
- **Sound:** Short sparkle sound effect (200ms)
- **Stacking:** Multiple unlocks at the same level display sequentially with 300ms delay between each
- **Pause menu indicator:** A golden "NEW" badge appears next to newly unlocked items in the relevant menu section. Badge persists until the player views the item.

---

## 3. Achievement System

### 3.1 Achievement Categories

| Category | Color | Icon Prefix | Description |
|----------|-------|-------------|-------------|
| planting | #4CAF50 | seedling | Planting milestones |
| harvesting | #8D6E63 | axe | Harvesting milestones |
| growing | #66BB6A | hourglass | Growth patience milestones |
| collection | #FFB300 | warehouse | Resource accumulation |
| mastery | #7B1FA2 | star | Level and skill mastery |
| exploration | #1E88E5 | compass | Discovery and travel |
| social | #E91E63 | heart | NPC and community |
| economy | #FF8F00 | coins | Trading and crafting |
| seasonal | #FF7043 | sun | Season-based challenges |
| secret | #9E9E9E | question-mark | Hidden achievements |

### 3.2 Complete Achievement List (45 Achievements)

The existing 35 achievements are retained. 10 new achievements are added (5 progressive tiers + 5 secret).

#### Planting (5 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 1 | `first-seed` | First Seed | Plant your first tree | treesPlanted >= 1 | 10 XP |
| 2 | `green-thumb` | Green Thumb | Plant 25 trees | treesPlanted >= 25 | 25 XP |
| 3 | `forest-founder` | Forest Founder | Plant 100 trees | treesPlanted >= 100 | 50 XP, 10 acorns |
| 4 | `grove-master` | Grove Master | Plant 500 trees | treesPlanted >= 500 | 150 XP, title "Grove Master" |
| 5 | `thousand-oaks` | Thousand Oaks | Plant 1,000 trees | treesPlanted >= 1000 | 300 XP, cosmetic "Golden Trowel" badge |

#### Harvesting (4 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 6 | `first-harvest` | First Harvest | Harvest your first tree | treesHarvested >= 1 | 10 XP |
| 7 | `lumberjack` | Lumberjack | Harvest 50 trees | treesHarvested >= 50 | 50 XP |
| 8 | `master-harvester` | Master Harvester | Harvest 200 trees | treesHarvested >= 200 | 100 XP, 20 timber |
| 9 | `eternal-reaper` | Eternal Reaper | Harvest 1,000 trees | treesHarvested >= 1000 | 250 XP, cosmetic "Silver Axe" badge |

#### Growing (4 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 10 | `patient-keeper` | Patient Keeper | Grow a tree to Old Growth | maxStageReached >= 4 | 30 XP |
| 11 | `ancient-grove` | Ancient Grove | Have 10 Old Growth trees at once | oldGrowthCount >= 10 | 75 XP, 15 sap |
| 12 | `watering-wizard` | Watering Wizard | Water 100 trees | treesWatered >= 100 | 40 XP |
| 13 | `deluge` | Deluge | Water 500 trees | treesWatered >= 500 | 100 XP, title "Rain Caller" |

#### Collection (5 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 14 | `timber-baron` | Timber Baron | Collect 500 timber | totalTimber >= 500 | 50 XP |
| 15 | `sap-tapper` | Sap Tapper | Collect 200 sap | totalSap >= 200 | 40 XP |
| 16 | `fruit-gatherer` | Fruit Gatherer | Collect 200 fruit | totalFruit >= 200 | 40 XP |
| 17 | `acorn-hoarder` | Acorn Hoarder | Collect 300 acorns | totalAcorns >= 300 | 50 XP |
| 18 | `resource-mogul` | Resource Mogul | Collect 1,000 of every resource (lifetime) | all lifetime >= 1000 | 200 XP, title "Mogul" |

#### Mastery (6 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 19 | `species-collector` | Species Collector | Plant all 12 base species | all base species planted | 100 XP |
| 20 | `level-5` | Apprentice Keeper | Reach level 5 | level >= 5 | 25 XP |
| 21 | `level-10` | Journeyman Keeper | Reach level 10 | level >= 10 | 50 XP |
| 22 | `level-25` | Grand Keeper | Reach level 25 | level >= 25 | 200 XP |
| 23 | `first-prestige` | Rebirth | Complete your first prestige | prestigeCount >= 1 | 100 XP (applied post-prestige) |
| 24 | `grid-master` | Grid Master | Expand your grid to 32x32 | currentGridSize >= 32 | 150 XP |

#### Social (4 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 25 | `first-friend` | First Friend | Befriend an NPC | npcsFriended >= 1 | 20 XP |
| 26 | `social-butterfly` | Social Butterfly | Befriend 5 NPCs | npcsFriended >= 5 | 75 XP, title "Friend of the Forest" |
| 27 | `quest-starter` | Quest Starter | Complete your first quest chain | questsCompleted >= 1 | 30 XP |
| 28 | `quest-master` | Quest Master | Complete 8 quest chains | questsCompleted >= 8 | 150 XP |

#### Exploration (4 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 29 | `first-discovery` | Keen Eye | Discover your first species in the codex | discoveryCount >= 1 | 15 XP |
| 30 | `codex-scholar` | Codex Scholar | Discover 8 species in the codex | discoveryCount >= 8 | 75 XP |
| 31 | `long-haul` | Long Haul | Play for 30 in-game days | totalDaysPlayed >= 30 | 50 XP |
| 32 | `century` | Century | Play for 100 in-game days | totalDaysPlayed >= 100 | 150 XP, title "Centurion" |

#### Economy (6 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 33 | `first-trade` | Market Opener | Complete your first trade | tradeCount >= 1 | 15 XP |
| 34 | `merchant-class` | Merchant Class | Complete 20 trades | tradeCount >= 20 | 75 XP |
| 35 | `first-craft` | Apprentice Crafter | Unlock your first recipe | recipesUnlocked >= 1 | 15 XP |
| 36 | `recipe-collector` | Recipe Collector | Unlock 12 recipes | recipesUnlocked >= 12 | 100 XP |
| 37 | `builder` | Builder | Place your first structure | structuresPlaced >= 1 | 20 XP |
| 38 | `architect` | Architect | Place 10 structures | structuresPlaced >= 10 | 100 XP |

#### Seasonal (2 achievements)

| # | ID | Name | Description | Trigger | Reward |
|---|-----|------|-------------|---------|--------|
| 39 | `festival-goer` | Festival Goer | Complete a seasonal festival | festivalCount >= 1 | 30 XP |
| 40 | `season-veteran` | Season Veteran | Complete all four seasonal festivals | festivalCount >= 4 | 150 XP, title "Keeper of Seasons" |

#### Secret (5 achievements)

Secret achievements are NOT shown in the achievement list until earned. Their slot appears as "???" with a lock icon. Once earned, the full details are revealed.

| # | ID | Name | Description | Trigger | Reward | Discovery Hint |
|---|-----|------|-------------|---------|--------|----------------|
| 41 | `moonlit-grove` | Moonlit Grove | Have 5 Ghost Birch trees at Old Growth during night | 5 Ghost Birch at stage 4 during nightTime | 100 XP, 5 Ghost Birch seeds | Night glow intensifies near multiple Ghost Birch |
| 42 | `perfect-symmetry` | Perfect Symmetry | Fill a 4x4 area with the same species, all at stage 4 | 16 same-species Old Growth in a square | 200 XP, cosmetic "Perfectionist" badge | -- (true secret) |
| 43 | `storm-survivor` | Storm Survivor | Have 20+ trees survive a windstorm with zero losses | 0 trees damaged in a windstorm event with 20+ trees | 75 XP, 25 timber | Bramble mentions storm survival in dialogue |
| 44 | `the-one-tree` | The One Tree | Plant, grow, and harvest the same tile 10 times without planting anywhere else | Same tile used 10 consecutive plant-grow-harvest cycles | 150 XP, title "The Patient One" | Sage hints at "the power of one rooted place" |
| 45 | `full-codex` | Living Encyclopedia | Complete the entire codex (all 15 species to Tier 4) | All species at discoveryTier 4 | 500 XP, cosmetic "Scholar's Border" (unique border cosmetic), title "Living Encyclopedia" | Codex UI shows completion percentage |

### 3.3 Achievement Rewards

Achievement rewards fall into four categories:

1. **XP:** Always granted. Amount scales with difficulty (10 XP for trivial, 500 XP for legendary).
2. **Resources:** Granted for collection/economy achievements. Deposited directly into inventory.
3. **Titles:** Cosmetic strings displayed next to the player's name in the pause menu. Player can select any earned title. Stored as `earnedTitles: string[]` and `activeTitle: string | null` in game state.
4. **Cosmetic badges:** Small icons displayed on the player's HUD nameplate. Stored similarly to titles.

### 3.4 Achievement UI

#### Popup Design
- **Container:** Rounded rectangle (border-radius 12px), gold border (3px solid #FFD700), dark background (#1A1A2E)
- **Animation:** Slides up from bottom of screen, holds for 3 seconds, slides down to dismiss
- **Content:** Achievement icon (32x32) on left, name in Fredoka bold (18px), description in Nunito (14px), XP reward shown as "+[N] XP" in gold
- **Sparkle effect:** 6 CSS sparkle particles radiate from the icon on appearance
- **Sound:** Achievement unlock chime (ascending arpeggio, 400ms)
- **Haptic:** Heavy impact

#### Achievement List (Pause Menu)
- **Grid layout:** 3 columns on desktop, 2 columns on mobile
- **Earned achievements:** Full color icon, name, description, date earned
- **Locked achievements:** Greyed-out icon, name visible, description says "Keep playing to unlock"
- **Secret achievements (locked):** Icon is "?", name is "???", description is "This achievement is a mystery..."
- **Secret achievements (earned):** Full reveal with a special purple border
- **Progress bar:** Shows "X / 45 Achievements" at the top
- **Category tabs:** Filter by category (horizontal scroll on mobile)

### 3.5 Progressive Achievement Chains

Some achievements form implicit chains. The UI groups these visually:

- **Planting chain:** First Seed (1) -> Green Thumb (25) -> Forest Founder (100) -> Grove Master (500) -> Thousand Oaks (1000)
- **Harvesting chain:** First Harvest (1) -> Lumberjack (50) -> Master Harvester (200) -> Eternal Reaper (1000)
- **Watering chain:** Watering Wizard (100) -> Deluge (500)
- **Level chain:** Apprentice Keeper (5) -> Journeyman Keeper (10) -> Grand Keeper (25)

In the achievement list, chain achievements show a progress bar beneath them indicating progress toward the next tier.

---

## 4. Prestige System

### 4.1 Prestige Requirements

- **Minimum level:** 25 (unchanged)
- **Trigger:** "Prestige" button in Pause Menu, with a confirmation dialog explaining what resets and what carries over
- **No upper limit:** Players can prestige indefinitely. Bonuses continue scaling (with diminishing returns beyond prestige 10).

### 4.2 Prestige Reset / Carry Matrix

#### RESETS (back to initial values)

| State Field | Resets To | Notes |
|------------|-----------|-------|
| level | 1 | -- |
| xp | 0 | -- |
| treesPlanted | 0 | -- |
| treesHarvested | 0 | -- |
| treesWatered | 0 | -- |
| treesMatured | 0 | -- |
| resources | all 0 | Exception: prestige 4+ milestone grants starting resources |
| seeds | 10 White Oak | Exception: prestige 1+ milestone grants 20 seeds |
| groveData | null | Fresh world generated |
| gridSize | 12 | -- |
| coins | 0 | -- |
| unlockedTools | [trowel, watering-can] | Exception: prestige 3 milestone unlocks all tools |
| unlockedSpecies | [white-oak + prestige species] | Prestige species are added immediately |
| speciesPlanted | [] | -- |
| placedStructures | [] | -- |
| activeQuests | [] | -- |
| completedQuestIds | [] | Quests are re-completable each prestige cycle |
| toolUpgrades | {} | -- |
| toolUseCounts | {} | -- |
| marketState | fresh | -- |
| merchantState | fresh | -- |
| marketEventState | fresh | -- |
| eventState | fresh | -- |
| currentZoneId | starting-grove | -- |
| discoveredZones | [starting-grove] | -- |
| wildTreesHarvested | 0 | -- |
| wildTreesRegrown | 0 | -- |
| treesPlantedInSpring | 0 | -- |
| treesHarvestedInAutumn | 0 | -- |
| worldSeed | new random seed | Procedural world regenerated |
| gameTimeMicroseconds | initial (Spring Day 1) | -- |

#### CARRIES OVER (never lost)

| State Field | Notes |
|------------|-------|
| prestigeCount | Incremented by 1 |
| achievements | All earned achievements persist forever |
| lifetimeResources | Cumulative across all prestiges |
| seasonsExperienced | -- |
| speciesProgress | Codex progress is permanent |
| pendingCodexUnlocks | Cleared (but underlying progress retained) |
| questChainState | Chain completion status persists; steps can be re-done for rewards |
| activeBorderCosmetic | -- |
| hasSeenRules | -- |
| hapticsEnabled | -- |
| soundEnabled | -- |
| visitedZoneTypes | Exploration knowledge persists |
| wildSpeciesHarvested | -- |
| earnedTitles | (new field) Titles are permanent |
| activeTitle | (new field) -- |

### 4.3 Prestige Bonuses (Expanded)

Retained from current implementation:

| Prestige | Growth Speed | XP Multiplier | Stamina Bonus | Harvest Yield |
|----------|-------------|---------------|---------------|---------------|
| 0 | 1.00x | 1.00x | +0 | 1.00x |
| 1 | 1.10x | 1.10x | +10 | 1.05x |
| 2 | 1.20x | 1.20x | +20 | 1.10x |
| 3 | 1.35x | 1.30x | +30 | 1.20x |
| 4 | 1.40x | 1.35x | +35 | 1.25x |
| 5 | 1.45x | 1.40x | +40 | 1.30x |
| 6 | 1.50x | 1.45x | +45 | 1.35x |
| 7 | 1.55x | 1.50x | +50 | 1.40x |
| 8 | 1.60x | 1.55x | +55 | 1.45x |
| 9 | 1.65x | 1.60x | +60 | 1.50x |
| 10 | 1.70x | 1.65x | +65 | 1.55x |
| 10+ | +0.03x/tier | +0.03x/tier | +3/tier | +0.03x/tier |

Formula for prestige > 10 (diminishing returns):
```
growthSpeedMultiplier = 1.70 + 0.03 * (prestigeCount - 10)
xpMultiplier = 1.65 + 0.03 * (prestigeCount - 10)
staminaBonus = 65 + 3 * (prestigeCount - 10)
harvestYieldMultiplier = 1.55 + 0.03 * (prestigeCount - 10)
```

### 4.4 Prestige Milestones

Special one-time rewards at specific prestige counts:

| Prestige | Milestone Name | Reward | Description |
|----------|---------------|--------|-------------|
| 1 | First Rebirth | 20 starting seeds (up from 10), Stone Wall cosmetic, Crystalline Oak species | "The cycle begins anew, stronger than before." |
| 2 | Second Cycle | Free Well structure placed at start, Flower Hedge cosmetic, Moonwood Ash species | "The grove remembers your touch." |
| 3 | Third Awakening | All tools unlocked at start (skip tool progression), Fairy Lights cosmetic, Worldtree species | "Mastery earns its own rewards." |
| 4 | Fourth Turning | 50 of each resource at start, Crystal Boundary cosmetic | "The forest provides for the worthy." |
| 5 | Fifth Convergence | Start at 16x16 grid (skip first expansion), Ancient Runes cosmetic, title "Ancient Keeper" | "The land itself bends to your will." |
| 7 | Seventh Seal | Start with 3 random species seeds (5 each) in addition to White Oak, cosmetic "Starlight Border" (new, animated) | "The stars align for the patient." |
| 10 | Tenth Circle | Start with Greenhouse pre-built, cosmetic "Worldtree Border" (animated roots), title "Eternal Keeper", 100 bonus starting seeds | "You have transcended the cycle." |

### 4.5 Prestige Motivation Design

Why players WANT to prestige:

1. **Permanent power:** Each prestige makes the next run faster and more productive. Growth speed and harvest yields compound.
2. **Exclusive species:** Crystal Oak, Moonwood Ash, and Worldtree are genuinely unique gameplay-altering species only available through prestige.
3. **Cosmetic flex:** Border cosmetics are the most visible customization in the game. They signal mastery to the player.
4. **Quality of life:** Milestones (all tools at start, free structures, starting resources) make replays smoother and more enjoyable.
5. **Fresh experience:** Procedural world regeneration means each prestige cycle explores different zone layouts and biome combinations.
6. **Completionism:** Secret achievements, full codex, and title collection all require multiple prestiges to complete.
7. **Speedrun appeal:** Prestige bonuses enable "how fast can I reach 25 again?" play.

### 4.6 Prestige Visual Changes

Each prestige level subtly changes the world's appearance:

| Prestige | Visual Change |
|----------|---------------|
| 0 | Standard look |
| 1 | Faint golden particles drift near Old Growth trees |
| 2 | Water tiles have a subtle shimmer effect |
| 3 | Moonlight is slightly brighter; stars are more visible at night |
| 4 | Seasonal color transitions are more vibrant (15% saturation boost) |
| 5+ | All above effects intensify. At prestige 5, a permanent subtle aurora effect appears in the night sky. |
| 10+ | The grove boundary glows faintly with the active cosmetic color. Trees at Old Growth have a very subtle outline glow. |

These are purely cosmetic, implemented via CSS overlays and shader parameter adjustments. They do NOT affect performance.

### 4.7 Prestige Difficulty Scaling

The game does NOT get harder on prestige. Instead:

- **Same base difficulty:** Growth times, weather probabilities, and resource costs are identical across all prestige levels.
- **Faster progression:** Prestige bonuses make the player strictly stronger, not weaker.
- **New content gating:** Prestige species and milestones provide new goals without adding friction.
- **Optional challenge:** A future "Ironkeep Mode" toggle could disable prestige bonuses for challenge runs (not in scope for this design).

---

## 5. Species Discovery Codex

### 5.1 Codex Structure

The codex is a book-like UI accessible via the Almanac tool or pause menu. Each species occupies a "page" (mobile) or "card" (desktop).

#### Visual Design
- **Book metaphor:** Left/right page swipe on mobile. Card grid on desktop.
- **Background:** Parchment texture (#F5F0E8), sepia-toned
- **Font:** Fredoka for species names, Nunito for body text
- **Illustrations:** The species' 3D mesh rendered as a small preview image (captured once via BabylonJS CreateScreenshot). Tier 0 shows a dark silhouette.

### 5.2 Discovery Tiers

| Tier | Name | Trigger | Visual State |
|------|------|---------|-------------|
| 0 | Unknown | Never planted | Dark silhouette, "???" for name, no text |
| 1 | Discovered | Planted at least once | Name revealed, icon in color, Tier 1 lore visible |
| 2 | Studied | Grown to Mature (stage 3) | Habitat and growth tip revealed, Tier 2 lore visible |
| 3 | Mastered | Grown to Old Growth (stage 4) | Fun fact revealed, Tier 3 lore visible, full mesh preview |
| 4 | Legendary | Harvested 10+ times | All lore revealed including Tier 4 secret, golden border on codex page |

### 5.3 Per-Species Codex Content Table

All 15 species (12 base + 3 prestige) have codex entries already defined in `game/constants/codex.ts`. The table below summarizes what is revealed at each tier:

| Species | Tier 0 | Tier 1 (Name + Lore) | Tier 2 (Habitat + Growth) | Tier 3 (Lore + Fun Fact) | Tier 4 (Secret Lore) |
|---------|--------|---------------------|--------------------------|-------------------------|---------------------|
| White Oak | Silhouette | "Backbone of any young grove..." | Temperate meadows; "Water regularly..." | "Ancient keepers believed first Oak is guardian..." | "A grove of 100 harvested Oaks hums with energy..." |
| Weeping Willow | Silhouette | "Drapes branches toward water, golden sap..." | Wetlands; "Plant near water for 30% bonus..." | "Weeps not from sadness but joy..." | "Legendary grove produced sap that glowed at dusk..." |
| Elder Pine | Silhouette | "Stands tall against mountain winds..." | Mountain slopes; "Grows at 30% in Winter..." | "Hermits carve symbols for safe paths..." | "Oldest grew for twelve generations..." |
| Cherry Blossom | Silhouette | "Paints the grove in soft pink hues..." | Sheltered temperate; "+10% XP aura..." | "First tree sprouted where keeper shed tears of joy..." | "Perpetual gentle glow, petals drift endlessly..." |
| Ghost Birch | Silhouette | "Glows faintly in the dark..." | Tundra edges; "50% growth in Winter..." | "Light up frozen valleys, guide travelers..." | "Remembers every hand that touched its bark..." |
| Redwood | Silhouette | "Towers above all others..." | Coastal fog belts; "5 timber per harvest..." | "Heartwood is impervious to rot..." | "Tallest reached so high clouds snagged on crown..." |
| Flame Maple | Silhouette | "Blazes with fiery orange and crimson..." | Highland clearings; "2-tile aura, 2x in Autumn..." | "Artists sought groves for falling leaf poetry..." | "Burned so brightly travelers mistook it for bonfire..." |
| Baobab | Silhouette | "Titan of the savanna..." | Savanna grasslands; "Drought-resistant..." | "Elders gather beneath for council..." | "Hollow trunk houses a library of journals..." |
| Silver Birch | Silhouette | "Graceful, quick-growing, papery bark..." | Temperate near streams; "+20% near water..." | "Bark prized for containers and scrolls..." | "Leaves form natural melody, visitors fall asleep..." |
| Ironbark | Silhouette | "A fortress wrapped in bark..." | Mountain strongholds; "Storm immune, 3x at OG..." | "Charcoal fueled hottest forges..." | "Develops metallic sheen, see reflection in bark..." |
| Golden Apple | Silhouette | "Bears luminous golden fruit..." | Orchards; "3x fruit in Autumn..." | "Plant where the sun sets, never go hungry..." | "Juice restores vigor, reverses bad hair day..." |
| Mystic Fern | Silhouette | "Not a tree, a colossal fern..." | Enchanted groves; "+15% per adjacent tree..." | "Scholars debate if truly a plant..." | "Hums below hearing, animals gather, soil turns fertile..." |
| Crystal Oak | Silhouette | "Shimmers with prismatic light..." | Enchanted (prestige); "5 acorns per harvest..." | "Each acorn contains prismatic crystal..." | "Refracts permanent rainbows, fills visitors with wonder..." |
| Moonwood Ash | Silhouette | "Grows under starlight, silvery bark..." | Enchanted (nocturnal); "Grows only at night..." | "Leaves absorb moonlight, release slowly..." | "Blooms once per decade, blessing of restful sleep..." |
| Worldtree | Silhouette | "Rarest and mightiest of all..." | Enchanted (prestige 3); "2x2 footprint..." | "Ancient texts speak of roots connecting all groves..." | "Becomes axis of grove, seasons kinder, storms gentler..." |

### 5.4 Codex Completion Rewards

| Milestone | Trigger | Reward |
|-----------|---------|--------|
| First Discovery | Any species reaches Tier 1 | 15 XP, toast notification |
| 5 Species Discovered | 5 species at Tier 1+ | 50 XP, "Budding Botanist" title |
| All Base Species Discovered | 12 base species at Tier 1+ | 100 XP, 5 rare seeds (random species) |
| 5 Species Studied | 5 species at Tier 2+ | 75 XP |
| 5 Species Mastered | 5 species at Tier 3+ | 150 XP, "Forest Scholar" title |
| All Species Mastered | All 15 species at Tier 3+ | 300 XP, 20 acorns |
| First Legendary | Any species reaches Tier 4 | 75 XP |
| 5 Species Legendary | 5 species at Tier 4 | 200 XP, "Lore Keeper" title |
| Full Codex | All 15 species at Tier 4 | 500 XP, "Living Encyclopedia" title, Scholar's Border cosmetic (secret achievement) |

### 5.5 Codex UI Specifications

#### Mobile (Portrait)
- **Access:** Tap Almanac tool, then "Codex" tab
- **Layout:** Single species per page, swipe left/right to navigate
- **Page layout:** Species silhouette/image (top 40%), name + tier badge (below image), scrollable lore text (bottom 50%), navigation dots at very bottom
- **Tier indicator:** 4 small circles below the name, filled = unlocked, empty = locked

#### Desktop
- **Access:** Click Almanac in toolbar, codex opens as an overlay
- **Layout:** 3-column card grid (4 cards per row for 15 species, scrollable)
- **Card design:** 200x280px, species image on top half, name + tier on bottom half, click to expand to full page
- **Hover state:** Card lifts slightly (translateY -4px), border highlights in tier color

#### Biome Pages
- **Additional pages:** 9 biome entries from `BIOME_CODEX`
- **Always visible:** Biome pages are not gated by discovery tiers
- **Content:** Biome name, description, climate, native species list (linked to species pages)

---

## 6. Seasonal Milestones

### 6.1 Per-Season Goals

Each season has a set of optional goals displayed in the Quest Panel. These refresh each in-game year.

#### Spring Goals
| Goal | Requirement | Reward |
|------|-------------|--------|
| Spring Planting | Plant 10 trees during Spring | 30 XP, 5 seeds (random) |
| Bloom Watch | Have 3 Cherry Blossom trees at Mature+ | 25 XP, 5 fruit |
| Rain Harvest | Water 20 trees during Spring | 20 XP, 5 sap |

#### Summer Goals
| Goal | Requirement | Reward |
|------|-------------|--------|
| Sun's Bounty | Harvest 15 trees during Summer | 40 XP, 10 timber |
| Growth Spurt | Grow 3 trees from Sapling to Mature | 30 XP, 5 sap |
| Bee Season | Collect 30 fruit during Summer | 25 XP, 5 acorns |

#### Autumn Goals
| Goal | Requirement | Reward |
|------|-------------|--------|
| Fall Harvest | Harvest 20 trees during Autumn | 50 XP, 10 acorns |
| Flame Display | Have 2 Flame Maple at Mature+ during Autumn | 30 XP, 3 Flame Maple seeds |
| Stockpile | Accumulate 50 of any single resource during Autumn | 35 XP, 10 timber |

#### Winter Goals
| Goal | Requirement | Reward |
|------|-------------|--------|
| Winter Vigil | Keep 15 trees alive through Winter | 40 XP, 10 sap |
| Evergreen Stand | Have 5 evergreen trees (Elder Pine, Redwood, Ironbark, Crystal Oak, Worldtree) at Mature+ | 50 XP, 5 Elder Pine seeds |
| Frost Resilience | Water 15 trees during Winter | 25 XP, 5 timber |

### 6.2 Seasonal Completion Rewards

Completing ALL goals for a single season grants a seasonal completion bonus:

| Season | Completion Bonus |
|--------|-----------------|
| Spring | 75 XP, 10 mixed seeds, title "Spring Guardian" |
| Summer | 80 XP, 15 mixed resources, title "Summer Champion" |
| Autumn | 85 XP, 10 acorns + 10 fruit, title "Autumn Warden" |
| Winter | 70 XP, 10 timber + 10 sap, title "Winter Sentinel" |

### 6.3 Year Completion Reward

**Full Year bonus:** Complete all 4 seasonal goal sets within one in-game year (4 seasons).

| Milestone | Reward |
|-----------|--------|
| First Full Year | 200 XP, "Keeper of Seasons" title, 20 mixed seeds, 25 of each resource |

### 6.4 Multi-Year Milestones

| Years Completed | Reward |
|----------------|--------|
| 1 | As above (first year bonus) |
| 3 | 300 XP, "Veteran Keeper" title |
| 5 | 500 XP, "Elder Keeper" title, cosmetic "Seasonal Wreath" badge |
| 10 | 1,000 XP, "Timeless Keeper" title |

### 6.5 Seasonal Goals vs. Festivals

- **Seasonal Goals** are personal milestones that run the entire season (30 in-game days). They are always available.
- **Festivals** are limited-time events (5-7 days) that trigger on specific days with their own challenges and rewards. Festivals are NOT required for seasonal completion.
- Both systems can be active simultaneously. Their rewards stack.

---

## 7. Tutorial & Progressive Revelation

### 7.1 Tutorial Step Sequence (10 Steps)

The tutorial activates on first play (when `hasSeenRules === false`). Each step is a non-blocking overlay with a highlighted UI element, instruction text, and a "Got it!" dismiss button. Steps advance based on player actions, not timers.

| Step | Name | Teaches | Trigger to Advance | UI Highlight | Instruction Text |
|------|------|---------|-------------------|-------------|-----------------|
| 1 | Welcome | Game overview | Tap "Got it!" | Center of screen (no highlight) | "Welcome to Grovekeeper! You are the keeper of a small grove. Your job: plant trees, tend them, and grow a thriving forest. Let's learn the basics." |
| 2 | Movement | How to move | Move the player character 2 tiles | Joystick (mobile) or WASD keys (desktop) | "Move around your grove. Drag anywhere on screen to walk (mobile) or use WASD keys (desktop). Tap a tile to walk there automatically." |
| 3 | Planting | How to plant | Plant 1 tree | Trowel tool in tool belt | "Select the Trowel from your tool belt, then tap an empty soil tile to plant a White Oak seed. You start with 10 seeds." |
| 4 | Watering | How to water | Water 1 tree | Watering Can tool in tool belt | "Switch to the Watering Can and tap a planted tree to water it. Watered trees grow 50% faster for one growth cycle." |
| 5 | Growth | Understanding growth | Wait for 1 tree to reach Sapling (stage 2) | A planted tree on the grid | "Trees grow through 5 stages: Seed, Sprout, Sapling, Mature, and Old Growth. Watch your tree grow! Each stage takes time." |
| 6 | Stamina | Stamina management | Stamina drops below 80 | Stamina gauge in HUD | "Every action costs stamina. Your stamina regenerates over time. Keep an eye on the green bar -- if it runs out, you'll need to rest." |
| 7 | XP & Levels | XP system | Earn 20 XP total | XP bar in HUD | "You earn XP from planting, watering, and harvesting. Level up to unlock new tree species, tools, and features!" |
| 8 | Almanac | Inspecting trees | Use Almanac on 1 tree | Almanac tool in tool belt | "Select the Almanac and tap any tree to see its species, growth stage, and stats. The Almanac also opens the Codex." |
| 9 | Time & Seasons | Day/night and seasons | Experience 1 full day/night cycle | Time display in HUD | "Time passes in your grove. Day and night affect visibility. Seasons change every 30 days -- each season affects tree growth differently." |
| 10 | Go Explore | Tutorial complete | Tap "Start Growing!" | Center of screen | "You're ready! Plant, tend, and watch your grove flourish. New species, tools, and features unlock as you level up. Every forest begins with a single seed." |

### 7.2 Tutorial Advancement Rules

- Steps 1, 10: Advance on button tap (no action required)
- Steps 2-9: Advance when the player completes the described action
- If a player accidentally dismisses a step, it does not re-show (the action trigger still activates the next step)
- The tutorial can be skipped entirely via a "Skip Tutorial" button on Step 1 (sets `hasSeenRules = true`)
- Tutorial state is stored as `tutorialStep: number` in game state (0 = not started, 1-10 = in progress, 11 = complete)

### 7.3 Post-Tutorial Contextual Hints

After the tutorial, contextual hints appear as brief toast notifications (3 seconds) when the player encounters a new system for the first time. Each hint shows only ONCE (tracked as `shownHints: string[]` in game state).

| Hint ID | Trigger | Content |
|---------|---------|---------|
| `hint-pruning` | Unlock Pruning Shears (level 3) | "Pruning Shears: tap a Mature tree to prune it for a harvest bonus!" |
| `hint-seeds` | Unlock Seed Pouch (level 4) | "Open the Seed Pouch to see all your seeds. Different species grow in different biomes." |
| `hint-harvesting` | Unlock Axe (level 7) | "The Axe lets you chop Old Growth trees for maximum timber. Mature trees can also be harvested for smaller yields." |
| `hint-trading` | First visit to trading interface | "You can trade resources here. Prices change with the seasons -- buy low, sell high!" |
| `hint-weather` | First weather event (rain/drought/wind) | "Weather affects your grove! Rain boosts growth, drought slows it, and windstorms can damage young trees." |
| `hint-quest` | First quest chain becomes available | "A quest is available! Check the Quest Panel to see what you can do. Quests reward XP and resources." |
| `hint-structure` | First structure becomes available | "You can now build structures! Structures boost nearby trees. Open the Build menu from the pause screen." |
| `hint-crafting` | First recipe unlocked | "You've unlocked a recipe! Combine resources to create useful items. Check the Crafting menu." |
| `hint-festival` | First festival begins | "A festival has started! Complete the festival challenges before time runs out for special rewards." |
| `hint-codex` | First species reaches Tier 2 | "Your Codex has new information! Check the Almanac to read species lore and growth tips." |
| `hint-prestige-preview` | Reach level 20 | "At level 25, you can Prestige -- resetting your grove but gaining permanent bonuses and rare species!" |
| `hint-prestige-ready` | Reach level 25 | "You've reached level 25! You can now Prestige from the Pause Menu. Check what you'll gain before deciding." |
| `hint-grid-expansion` | Grid expansion becomes affordable | "Your grove can expand! Check the Pause Menu to purchase a grid expansion with resources." |
| `hint-npc` | First NPC encounter | "You've met an NPC! Talk to them for tips, trades, and quests. Build friendship by completing their quest chains." |
| `hint-merchant` | Traveling merchant arrives | "A traveling merchant has arrived! They offer rare items for a limited time. Check their stock!" |

### 7.4 Help System

Players can access help at any time via the Pause Menu:

- **"How to Play" button:** Re-shows the 10 tutorial steps as a scrollable guide (not interactive, just informational)
- **Tip of the Day:** Each time the pause menu opens, a random tip is shown at the bottom. Tips are drawn from a pool of 30+ context-sensitive tips.
- **Codex as reference:** The Almanac/Codex serves as the in-game encyclopedia. Species growth tips and habitat info teach the player organically.

#### Tip Pool (sample -- full pool is 30+ entries)

```
"Water trees right after planting for a growth speed boost."
"Cherry Blossoms give +10% XP to nearby actions. Plant them near your work area."
"Elder Pine keeps growing in Winter when other trees go dormant."
"Ghost Birch glows at night -- useful for spotting your trees after dark."
"Ironbark is immune to windstorm damage. Plant them to protect your grove."
"Golden Apple yields 3x fruit in Autumn. Time your harvests!"
"Mystic Fern grows faster with more adjacent trees. Surround it!"
"Structures have effect radii. Place them centrally for maximum benefit."
"The traveling merchant appears every few days with rare offers."
"Seasonal festivals have limited-time challenges with special rewards."
"Trade resources when seasonal prices are high for better deals."
"Prestige species (Crystal Oak, Moonwood Ash, Worldtree) are worth the reset."
"Complete NPC quest chains for friendship points, unique rewards, and lore."
"Your codex tracks everything you learn about each species."
"Old Growth trees are worth much more when harvested."
"Build a Greenhouse near your trees for a permanent growth boost."
"The Compost Bin turns waste into 2x growth for one cycle."
"Rain Catchers auto-water trees in their radius during rain."
"Scarecrows protect trees from windstorm damage in a 3-tile radius."
"The Grafting Tool combines yields from two species on one tree."
```

---

## 8. Config JSON Schemas

### 8.1 XP Sources Config Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "XP Sources Configuration",
  "type": "object",
  "properties": {
    "coreActions": {
      "type": "object",
      "properties": {
        "plant": { "type": "number", "description": "XP per tree planted" },
        "water": { "type": "number", "description": "XP per tree watered" },
        "harvest": { "type": "number", "description": "XP per tree harvested" },
        "harvestOldGrowth": { "type": "number", "description": "Bonus XP for harvesting Old Growth" },
        "prune": { "type": "number", "description": "XP per tree pruned" },
        "clearTile": { "type": "number", "description": "XP per tile cleared" },
        "growToSapling": { "type": "number", "description": "XP when tree reaches stage 2" },
        "growToMature": { "type": "number", "description": "XP when tree reaches stage 3" },
        "growToOldGrowth": { "type": "number", "description": "XP when tree reaches stage 4" }
      },
      "required": ["plant", "water", "harvest", "harvestOldGrowth", "prune", "clearTile", "growToSapling", "growToMature", "growToOldGrowth"]
    },
    "economyActions": {
      "type": "object",
      "properties": {
        "craftTier1": { "type": "number" },
        "craftTier2": { "type": "number" },
        "craftTier3": { "type": "number" },
        "craftTier4": { "type": "number" },
        "completeTrade": { "type": "number" },
        "merchantPurchase": { "type": "number" }
      },
      "required": ["craftTier1", "craftTier2", "craftTier3", "craftTier4", "completeTrade", "merchantPurchase"]
    },
    "socialActions": {
      "type": "object",
      "properties": {
        "firstNpcTalk": { "type": "number" },
        "friendshipTierUp": { "type": "number" },
        "completeNpcChain": { "type": "number" }
      },
      "required": ["firstNpcTalk", "friendshipTierUp", "completeNpcChain"]
    },
    "discoveryActions": {
      "type": "object",
      "properties": {
        "speciesTier1": { "type": "number" },
        "speciesTier2": { "type": "number" },
        "speciesTier3": { "type": "number" },
        "speciesTier4": { "type": "number" }
      },
      "required": ["speciesTier1", "speciesTier2", "speciesTier3", "speciesTier4"]
    }
  },
  "required": ["coreActions", "economyActions", "socialActions", "discoveryActions"]
}
```

### 8.2 XP Sources Config Values

```json
{
  "coreActions": {
    "plant": 5,
    "water": 2,
    "harvest": 10,
    "harvestOldGrowth": 25,
    "prune": 3,
    "clearTile": 5,
    "growToSapling": 8,
    "growToMature": 15,
    "growToOldGrowth": 30
  },
  "economyActions": {
    "craftTier1": 10,
    "craftTier2": 25,
    "craftTier3": 50,
    "craftTier4": 100,
    "completeTrade": 8,
    "merchantPurchase": 15
  },
  "socialActions": {
    "firstNpcTalk": 10,
    "friendshipTierUp": 25,
    "completeNpcChain": 50
  },
  "discoveryActions": {
    "speciesTier1": 15,
    "speciesTier2": 25,
    "speciesTier3": 40,
    "speciesTier4": 75
  }
}
```

### 8.3 Achievement Config Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Achievement Definition",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "icon": { "type": "string" },
    "category": {
      "type": "string",
      "enum": ["planting", "harvesting", "growing", "collection", "mastery", "exploration", "social", "economy", "seasonal", "secret"]
    },
    "secret": { "type": "boolean", "default": false },
    "checkField": { "type": "string", "description": "PlayerStats field to check" },
    "checkOperator": { "type": "string", "enum": [">=", "==", "includes_all", "custom"] },
    "checkValue": { "description": "Value to compare against (number, string, or array)" },
    "reward": {
      "type": "object",
      "properties": {
        "xp": { "type": "number" },
        "resources": { "type": "object" },
        "title": { "type": "string" },
        "cosmetic": { "type": "string" },
        "seeds": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "speciesId": { "type": "string" },
              "amount": { "type": "number" }
            }
          }
        }
      }
    },
    "chain": {
      "type": "object",
      "description": "If this achievement is part of a progressive chain",
      "properties": {
        "chainId": { "type": "string" },
        "order": { "type": "number" }
      }
    }
  },
  "required": ["id", "name", "description", "icon", "category", "reward"]
}
```

### 8.4 Prestige Config Schema (Extended)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Prestige Configuration",
  "type": "object",
  "properties": {
    "minLevel": { "type": "number" },
    "bonusTable": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "growthSpeedMultiplier": { "type": "number" },
          "xpMultiplier": { "type": "number" },
          "staminaBonus": { "type": "number" },
          "harvestYieldMultiplier": { "type": "number" }
        },
        "required": ["growthSpeedMultiplier", "xpMultiplier", "staminaBonus", "harvestYieldMultiplier"]
      }
    },
    "scalingBeyond3": {
      "type": "object",
      "properties": {
        "growthBase": { "type": "number" },
        "growthStep": { "type": "number" },
        "xpBase": { "type": "number" },
        "xpStep": { "type": "number" },
        "staminaBase": { "type": "number" },
        "staminaStep": { "type": "number" },
        "harvestBase": { "type": "number" },
        "harvestStep": { "type": "number" }
      }
    },
    "diminishingThreshold": {
      "type": "number",
      "description": "Prestige count after which scaling slows down (default: 10)"
    },
    "diminishingStep": {
      "type": "number",
      "description": "Reduced per-tier increment after threshold (default: 0.03)"
    },
    "cosmetics": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "prestigeRequired": { "type": "number" },
          "borderColor": { "type": "string" },
          "borderStyle": { "type": "string" },
          "glowColor": { "type": "string" },
          "animated": { "type": "boolean" }
        },
        "required": ["id", "name", "description", "prestigeRequired", "borderColor", "borderStyle"]
      }
    },
    "milestones": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "prestigeLevel": { "type": "number" },
          "description": { "type": "string" },
          "bonusSeeds": { "type": "number" },
          "bonusResources": { "type": "object" },
          "freeStructure": { "type": "string" },
          "allToolsUnlocked": { "type": "boolean" },
          "startingGridSize": { "type": "number" },
          "extraSeedSpecies": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "speciesId": { "type": "string" },
                "amount": { "type": "number" }
              }
            }
          },
          "freeBuilding": { "type": "string" },
          "bonusStartingSeeds": { "type": "number" },
          "title": { "type": "string" },
          "cosmetic": { "type": "string" }
        },
        "required": ["prestigeLevel", "description"]
      }
    },
    "resetFields": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of state fields that reset on prestige"
    },
    "carryFields": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of state fields that carry over on prestige"
    }
  },
  "required": ["minLevel", "bonusTable", "cosmetics", "milestones"]
}
```

### 8.5 Tutorial Config Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Tutorial Configuration",
  "type": "object",
  "properties": {
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "name": { "type": "string" },
          "instruction": { "type": "string" },
          "highlightElement": {
            "type": "string",
            "description": "CSS selector or element ID to highlight"
          },
          "advanceTrigger": {
            "type": "string",
            "enum": ["button_tap", "player_move", "tree_planted", "tree_watered", "tree_grew", "stamina_drop", "xp_earned", "almanac_used", "day_night_cycle", "complete_button"]
          },
          "advanceThreshold": {
            "type": "number",
            "description": "Numeric threshold for the trigger (e.g., move 2 tiles, earn 20 XP)"
          }
        },
        "required": ["id", "name", "instruction", "advanceTrigger"]
      }
    },
    "contextualHints": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "trigger": { "type": "string" },
          "content": { "type": "string" },
          "showOnce": { "type": "boolean", "default": true }
        },
        "required": ["id", "trigger", "content"]
      }
    },
    "tipPool": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["steps", "contextualHints", "tipPool"]
}
```

### 8.6 Seasonal Milestones Config Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Seasonal Milestones Configuration",
  "type": "object",
  "properties": {
    "seasons": {
      "type": "object",
      "patternProperties": {
        "^(spring|summer|autumn|winter)$": {
          "type": "object",
          "properties": {
            "goals": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "name": { "type": "string" },
                  "description": { "type": "string" },
                  "targetType": { "type": "string" },
                  "targetAmount": { "type": "number" },
                  "speciesFilter": { "type": "string" },
                  "reward": {
                    "type": "object",
                    "properties": {
                      "xp": { "type": "number" },
                      "resources": { "type": "object" },
                      "seeds": { "type": "array" }
                    }
                  }
                },
                "required": ["id", "name", "targetType", "targetAmount", "reward"]
              }
            },
            "completionReward": {
              "type": "object",
              "properties": {
                "xp": { "type": "number" },
                "resources": { "type": "object" },
                "seeds": { "type": "array" },
                "title": { "type": "string" }
              }
            }
          },
          "required": ["goals", "completionReward"]
        }
      }
    },
    "yearCompletion": {
      "type": "object",
      "properties": {
        "reward": {
          "type": "object",
          "properties": {
            "xp": { "type": "number" },
            "title": { "type": "string" },
            "seeds": { "type": "array" },
            "resources": { "type": "object" }
          }
        }
      }
    },
    "multiYearMilestones": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "years": { "type": "number" },
          "reward": {
            "type": "object",
            "properties": {
              "xp": { "type": "number" },
              "title": { "type": "string" },
              "cosmetic": { "type": "string" }
            }
          }
        },
        "required": ["years", "reward"]
      }
    }
  },
  "required": ["seasons", "yearCompletion", "multiYearMilestones"]
}
```

---

## Appendix A: New Game State Fields

The following new fields are needed in `gameStore.ts` to support this design:

```typescript
// Tutorial
tutorialStep: number;           // 0 = not started, 1-10 = in progress, 11 = complete
shownHints: string[];           // IDs of contextual hints already shown

// Titles & Cosmetics
earnedTitles: string[];         // All earned title strings
activeTitle: string | null;     // Currently displayed title
earnedBadges: string[];         // Cosmetic badge IDs earned from achievements

// Seasonal Milestones
seasonalGoalProgress: Record<string, number>;  // goalId -> current progress
completedSeasonalGoals: string[];              // goalId[]
completedYears: number;                        // Full years completed (all 4 seasons)
currentYearSeasons: string[];                  // Seasons completed in current year

// Lifetime stats (for achievements)
totalTreesPlantedLifetime: number;   // Across all prestiges
totalTreesHarvestedLifetime: number; // Across all prestiges
totalTreesWateredLifetime: number;   // Across all prestiges
totalCrafts: number;                 // Lifetime craft count
```

## Appendix B: Implementation Priority

1. **Phase 1 (Highest priority):** XP sources config, achievement rewards, tutorial system
2. **Phase 2:** Seasonal milestones, codex completion rewards, contextual hints
3. **Phase 3:** Prestige milestones (5, 7, 10), prestige visual changes, titles/badges
4. **Phase 4:** Secret achievements, progressive achievement chains with UI, multi-year milestones

## Appendix C: Source File References

| System | Current File | Config File |
|--------|-------------|-------------|
| XP Formula | `game/stores/gameStore.ts` (lines 99-120) | -- (hardcoded) |
| Level Unlocks | `game/systems/levelUnlocks.ts` | -- (hardcoded) |
| Achievements | `game/systems/achievements.ts` | `config/game/achievements.json` |
| Prestige | `game/systems/prestige.ts` | `config/game/prestige.json` |
| Species Codex | `game/constants/codex.ts` | -- (hardcoded) |
| Species Discovery | `game/systems/speciesDiscovery.ts` | -- (uses codex.ts) |
| Recipes | `game/systems/recipes.ts` | -- (hardcoded) |
| Grid Expansion | `game/systems/gridExpansion.ts` | `config/game/grid.json` |
| Festivals | `game/events/eventScheduler.ts` | `game/events/data/festivals.json` |
| Encounters | `game/events/eventScheduler.ts` | `game/events/data/encounters.json` |
| Quest Chains | `game/quests/questChainEngine.ts` | `game/quests/data/questChains.json` |
| Structures | `game/structures/StructureManager.ts` | `game/structures/data/structures.json` |
| Species Data | `game/config/species.ts` | `config/game/species.json` |
| Tools Data | `game/config/tools.ts` | `config/game/tools.json` |
| NPCs | -- | `config/game/npcs.json` |
