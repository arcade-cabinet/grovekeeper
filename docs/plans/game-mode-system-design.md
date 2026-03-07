**Historical -- superseded by [`docs/plans/2026-03-07-unified-game-design.md`](2026-03-07-unified-game-design.md)**
*The unified design replaces exploration mode with survival-only (4 difficulty tiers: Seedling/Sapling/Hardwood/Ironwood). See Section 3 of the unified doc.*

---

# Game Mode System Design Document

**Author:** Claude (Opus 4.6)
**Date:** 2026-03-06
**Branch:** feature/content-depth-expansion
**Status:** Superseded (2026-03-07)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Mode Comparison Table](#2-mode-comparison-table)
3. [Mode Selection UI](#3-mode-selection-ui)
4. [Exploration Mode Specification](#4-exploration-mode-specification)
5. [Survival Mode Specification](#5-survival-mode-specification)
6. [Hearts System Specification](#6-hearts-system-specification)
7. [Weather Impact Tables (Survival)](#7-weather-impact-tables-survival)
8. [Seasonal Danger Tables](#8-seasonal-danger-tables)
9. [Structure Roles by Mode](#9-structure-roles-by-mode)
10. [Difficulty Multiplier Matrix](#10-difficulty-multiplier-matrix)
11. [Config JSON Schema](#11-config-json-schema)
12. [System Architecture](#12-system-architecture)
13. [System Modification List](#13-system-modification-list)
14. [Game Feel Analysis](#14-game-feel-analysis)

---

## 1. Executive Summary

Replace the current five-tier difficulty system (`explore`, `normal`, `hard`, `brutal`, `ultra-brutal` in `config/game/difficulty.json`) with a two-mode split inspired by Minecraft's Creative/Survival divide. The existing difficulty config is defined but **not yet consumed** by game systems (see spec note: "Difficulty not applied: config/game/difficulty.json exists but multipliers not consumed by game systems"). This means the refactor can be done cleanly -- we are replacing an unused config with a fully-integrated system.

**Current state:**
- `gameStore.difficulty` stores a string (`"normal"`) but is never read by growth, weather, stamina, or harvest systems.
- `growth.ts` uses `species.difficulty` (1-5), which is the species complexity rating -- this stays unchanged.
- `difficulty.json` has rich multiplier data but zero consumers. It will be replaced.

**Proposed state:**
- `gameStore.gameMode`: `"exploration" | "survival"` -- immutable after game creation.
- `gameStore.survivalTier`: `"gentle" | "standard" | "harsh" | "ironwood" | null` -- only set when `gameMode === "survival"`.
- A single `getModeConfig()` function returns all multipliers for the active mode+tier combination.
- All systems read from this config. No `if (mode === 'survival')` guards scattered through the codebase.

---

## 2. Mode Comparison Table

| Feature | Exploration | Survival |
|---|---|---|
| **Core Fantasy** | Cozy creator, collector, gardener | Resilient survivor, strategic planner |
| **Hearts/Health** | None | 3-7 hearts (tier-dependent) |
| **Death/Defeat** | Impossible | Unconsciousness or permadeath |
| **Weather Effects** | Visual only (rain is pretty) | Mechanical impact (floods, cold, heat) |
| **Stamina** | 200 max, 5.0/sec regen, 0.5x drain | 100 max, 2.0/sec base, 1.0-2.0x drain |
| **Growth Speed** | 1.5x base | 0.4x - 1.0x (tier-dependent) |
| **Harvest Yield** | 1.5x base | 0.3x - 1.0x (tier-dependent) |
| **Season Length** | 120 game days (long, relaxed) | 45-90 game days (tier-dependent) |
| **Windstorm Damage** | 0% (trees are safe) | 10-25% chance (tier-dependent) |
| **Drought** | Visual haze, no growth penalty | -50% to -80% growth (tier-dependent) |
| **Structure Degradation** | None | 0-5 HP/season (tier-dependent) |
| **Crop Disease** | Disabled | Enabled on Harsh/Ironwood |
| **Starting Resources** | Generous (50/30/20/30) | Scarce (3-20 per resource) |
| **Starting Seeds** | 15 white-oak | 3-10 white-oak (tier-dependent) |
| **Species Unlock Pace** | Levels reduced by 30% | Standard unlock levels |
| **Building Placement** | Free (no level requirements) | Standard level requirements |
| **Exposure System** | Disabled | Enabled (drift rate 0.3 - 1.5) |
| **Permadeath** | Never | Optional (forced on Ironwood) |
| **XP Multiplier** | 1.0x | 1.0x - 2.0x (harder = more reward) |
| **Prestige** | Available at level 25 | Available at level 25 |
| **NPC Relationships** | Full access, relaxed pace | Full access |
| **Codex/Discovery** | Full access | Full access |
| **Quests** | Full access, no time pressure | Full access, some timed |

---

## 3. Mode Selection UI

### 3.1 New Game Flow

```
Main Menu
  |
  v
[New Game]
  |
  v
Seed Phrase Input (existing)
  |
  v
Mode Selection Screen    <-- NEW
  |
  +-- [Exploration] --> Start Game
  |
  +-- [Survival] --> Survival Tier Modal --> Start Game
```

### 3.2 Mode Selection Screen Wireframe (375px portrait)

```
+-----------------------------------+
|         GROVEKEEPER               |
|     Choose Your Path              |
|                                   |
| +-------------------------------+ |
| |  [leaf icon]                  | |
| |                               | |
| |  EXPLORATION                  | |
| |                               | |
| |  "Tend your grove in peace"   | |
| |                               | |
| |  * No danger, no pressure    | |
| |  * Weather is visual only    | |
| |  * Generous stamina          | |
| |  * Build freely              | |
| |  * Focus on creativity       | |
| |    and collection            | |
| |                               | |
| |  [  Begin Exploring  ]       | |
| +-------------------------------+ |
|                                   |
| +-------------------------------+ |
| |  [shield icon]                | |
| |                               | |
| |  SURVIVAL                    | |
| |                               | |
| |  "Nature is beautiful        | |
| |   and dangerous"             | |
| |                               | |
| |  * Hearts & health system    | |
| |  * Weather impacts gameplay  | |
| |  * Scarce resources          | |
| |  * Prepare for seasons       | |
| |  * Structures matter         | |
| |    for survival              | |
| |                               | |
| |  [  Face the Wild  ]         | |
| +-------------------------------+ |
|                                   |
|          [Back]                   |
+-----------------------------------+
```

**Design notes:**
- Cards are full-width, stacked vertically for 375px portrait.
- Exploration card has a warm green background gradient (`#4CAF50` to `#81C784`).
- Survival card has a cool blue-to-slate gradient (`#37474F` to `#546E7A`).
- Touch targets: buttons are 48px tall, full card width minus 32px padding.
- No horizontal scroll. Each card is ~220px tall.
- Total content height: ~540px, fits iPhone SE viewport (667px) without scroll.

### 3.3 Survival Tier Modal Wireframe

When "Face the Wild" is tapped, a bottom-sheet modal slides up:

```
+-----------------------------------+
|                                   |
|  (dimmed mode selection behind)   |
|                                   |
+-----------------------------------+
| ================================= |
|                                   |
|   Choose Your Challenge           |
|                                   |
| +-------------------------------+ |
| | GENTLE          [sprout icon] | |
| | "A soft introduction"         | |
| | 7 hearts, mild weather,      | |
| | forgiving stamina             | |
| +-------------------------------+ |
|                                   |
| +-------------------------------+ |
| | STANDARD            [sun icon]| |
| | "The intended experience"     | |
| | 5 hearts, balanced challenge  | |
| |                    [DEFAULT]  | |
| +-------------------------------+ |
|                                   |
| +-------------------------------+ |
| | HARSH           [storm icon]  | |
| | "Nature fights back"          | |
| | 3 hearts, severe weather,     | |
| | scarce resources              | |
| +-------------------------------+ |
|                                   |
| +-------------------------------+ |
| | IRONWOOD         [skull icon] | |
| | "One bad winter ends it all"  | |
| | 3 hearts, permadeath,         | |
| | maximum severity              | |
| +-------------------------------+ |
|                                   |
|  [ ] Permadeath (forced for      |
|      Ironwood)                    |
|                                   |
|    [  Start Survival Game  ]      |
|                                   |
+-----------------------------------+
```

**Design notes:**
- Bottom sheet with drag handle, slides up from bottom 70% of viewport.
- Tier cards are compact (60px each), single-line description.
- Selected tier has a highlighted border (2px solid white).
- Permadeath checkbox auto-checked and disabled for Ironwood.
- "Standard" is pre-selected as default.
- Scrollable if viewport is too short (iPhone SE handled).

---

## 4. Exploration Mode Specification

### 4.1 Philosophy

Exploration mode is NOT "Easy mode with a fancy name." It is a fundamentally different game experience. The design pillars are:

1. **Creative Expression** -- Building and planting are the primary activities, not resource management.
2. **Collection Completionism** -- Filling the codex, discovering all species, completing all NPC quest chains.
3. **Aesthetic Appreciation** -- Weather, seasons, and day/night exist for beauty, not threat.
4. **Relaxed Progression** -- The player should never feel blocked, gated, or frustrated.

### 4.2 System Modifications

| System | Modification | Rationale |
|---|---|---|
| **Stamina** | 200 max, 5.0/sec regen, 0.5x drain | Player should rarely see stamina bar move. Actions feel free. |
| **Weather** | All mechanical multipliers = 1.0. Visual effects remain. | Rain still looks beautiful. Drought haze still renders. No growth/stamina impact. |
| **Windstorm** | Damage chance = 0% | No tree destruction ever. |
| **Growth** | 1.5x speed multiplier | Trees grow noticeably faster. Watching growth is the reward loop. |
| **Harvest** | 1.5x yield multiplier | Generous returns. Building materials flow freely. |
| **Season Length** | 120 game days per season | Long seasons to enjoy each one. No rush. |
| **Species Unlocks** | Unlock levels reduced by 30% (floor of level * 0.7) | Earlier access to more species. Collecting is the game. |
| **Building** | Level requirements reduced by 50% | Build freely, build early. |
| **Starting Resources** | 50 timber, 30 sap, 20 fruit, 30 acorns | Enough to start building immediately. |
| **Starting Seeds** | 15 white-oak | Generous starting grove. |
| **Exposure/Hearts** | Disabled entirely | No health system. |
| **Structure Degradation** | 0 | Buildings last forever. |
| **Crop Disease** | Disabled | Trees are safe. |
| **XP Multiplier** | 1.0x | Standard XP -- progression still matters. |

### 4.3 What Makes Exploration Mode Feel GOOD

- **Abundance, not easiness.** The player isn't "beating an easy game." They are in a generous world that rewards creativity. The satisfaction comes from building a beautiful grove, not from overcoming scarcity.
- **Weather as ambiance.** Rain on your grove is calming. Snow falling on your Old Growth pines is magical. These exist for emotion, not stress.
- **No wasted sessions.** A 5-minute commute session always ends with progress. You never open the app to find your trees dead from drought.
- **Building as play.** With reduced costs and no level gates, structure placement becomes a creative sandbox. Lay out your dream grove from day one.
- **Discovery joy.** With species unlocking earlier, the codex fills with satisfying speed. Each new species is a gift, not a grind.

---

## 5. Survival Mode Specification

### 5.1 Philosophy

Survival mode adds stakes that make every decision meaningful. The cozy world gains teeth. The design pillars are:

1. **Preparation** -- Success comes from planning ahead: stockpile for winter, build shelter before storms.
2. **Resource Tension** -- Scarcity creates interesting choices. Do you plant fast-growing White Oaks or invest in slow Baobabs?
3. **Environmental Storytelling** -- Weather and seasons are characters in the narrative. Winter is the antagonist.
4. **Earned Safety** -- Structures protect you. A well-placed campfire is a lifeline, not a decoration.

### 5.2 Hearts System Overview

Hearts are the health system for Survival mode. They represent the player character's physical condition.

- Hearts are displayed as pixel-art hearts in the HUD, top-left, below the resource bar.
- Half-heart granularity (each heart = 2 half-hearts internally).
- Hearts are stored as a float in the store: `hearts: 5.0` means 5 full hearts.
- At 0 hearts: defeat event triggers (see Section 6.4).

### 5.3 Survival Sub-Tiers

| Aspect | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| **Tagline** | "A soft introduction" | "The intended experience" | "Nature fights back" | "One bad winter ends it all" |
| **Max Hearts** | 7 | 5 | 3 | 3 |
| **Heart Regen** | 0.5/min near shelter | 0.25/min near shelter | 0.1/min near shelter | 0.05/min near shelter |
| **Dawn Renewal** | +2 hearts | +1 heart | +0.5 hearts | None |
| **Permadeath** | Optional | Optional | Optional | Forced |
| **Defeat Penalty** | Lose 25% carried resources | Lose 50% carried resources | Lose all carried resources | Game over (new game required) |

---

## 6. Hearts System Specification

### 6.1 ECS Component

Add to `Entity` in `game/ecs/world.ts`:

```typescript
export interface HealthComponent {
  hearts: number;       // current hearts (float, e.g. 4.5)
  maxHearts: number;    // max hearts (3, 5, or 7)
  invulnerable: boolean; // brief invulnerability after taking damage
  invulnerableTimer: number; // seconds remaining
  sheltered: boolean;   // updated per frame: is player inside/near a shelter structure?
  lastDamageSource: string | null; // for death screen flavor text
}
```

### 6.2 Damage Sources and Amounts

| Source | Condition | Damage | Frequency | Blockable? |
|---|---|---|---|---|
| **Cold Exposure** | Winter + not sheltered + night | 0.5 hearts/game-minute | Continuous | Shelter, campfire |
| **Heat Exposure** | Summer + drought active | 0.25 hearts/game-minute | Continuous | Shelter, well nearby |
| **Exhaustion** | 0 stamina + attempt tool action | 1.0 heart per action | On action | Don't use tools at 0 stamina |
| **Windstorm Debris** | Windstorm active + outdoors | 0.5 hearts per hit | Random (10-25% chance/check) | Shelter, walls |
| **Starvation** | 0 fruit in inventory for 2+ game days | 0.25 hearts/game-minute | Continuous | Eat fruit |
| **Dehydration** | Summer + no water source within 3 tiles | 0.15 hearts/game-minute | Continuous | Well, rain catcher |

**Damage scaling by tier:**

| Source | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| Cold Exposure | 0.25/min | 0.5/min | 1.0/min | 1.5/min |
| Heat Exposure | 0.1/min | 0.25/min | 0.5/min | 0.75/min |
| Exhaustion | 0.5/action | 1.0/action | 1.5/action | 2.0/action |
| Windstorm Debris | 0.25/hit | 0.5/hit | 1.0/hit | 1.5/hit |
| Starvation | 0.1/min | 0.25/min | 0.5/min | 0.75/min |
| Dehydration | 0.05/min | 0.15/min | 0.3/min | 0.5/min |

### 6.3 Healing Sources and Amounts

| Source | Healing | Condition | Notes |
|---|---|---|---|
| **Eating Fruit** | +1.0 heart | Costs 1 fruit resource | Active action (tap fruit in inventory) |
| **Campfire/Shelter** | +regen rate/min | Must be within 2 tiles of campfire or inside shelter footprint | Passive, continuous |
| **Herbal Remedy** | +2.0 hearts | Crafted: 3 sap + 2 fruit | Instant, costs resources |
| **Dawn Renewal** | +0.5 to +2.0 hearts | Automatic at dawn (dayProgress crosses 0.2) | Tier-dependent, free |
| **Well Proximity** | +0.1 hearts/min | Within well effect radius | Passive, stacks with shelter |
| **Full Rest** | +max hearts | Sleep action (skip to dawn) | Costs 1 game night, must be sheltered |

### 6.4 Defeat (0 Hearts)

**Non-permadeath:**
1. Screen fades to black with flavor text based on `lastDamageSource`:
   - Cold: "The frost claimed you... but the grove endures."
   - Heat: "The sun burned too bright... but dawn brings relief."
   - Exhaustion: "You collapsed from exhaustion... but rest restores."
   - Windstorm: "The storm battered you... but you are resilient."
   - Starvation: "Hunger overwhelmed you... but the grove provides."
2. Player respawns at home zone (starting-grove) center tile.
3. Resource penalty applied per tier (25% / 50% / 100% of carried resources dropped).
4. Hearts restored to 50% of max.
5. Time advances by `unconsciousnessHoursLost` game hours (6 / 24 for Gentle/Standard).
6. Dropped resources appear as collectible entities at the death location (despawn after 3 game days).

**Permadeath (Ironwood or opt-in):**
1. Same fade-to-black with flavor text.
2. "Your grove returns to the wild." message.
3. Save is deleted. Return to main menu.
4. Achievement tracking persists (achievements earned before death are kept).

### 6.5 HUD Display

Hearts render as a horizontal row of heart icons in the top-left, directly below the resource bar.

```
[Timber: 42] [Sap: 18] [Fruit: 7] [Acorns: 23]
[<3] [<3] [<3] [<3] [</3]       <-- 4.5 out of 5 hearts
[Stamina: ====-------- 40/100]
```

- Full heart: filled red pixel-art heart.
- Half heart: left-half filled.
- Empty heart: grey outline.
- When hearts <= 25% max: hearts pulse/flash red as warning.
- Heart loss: brief red flash overlay on canvas (100ms, 10% opacity).
- Heart gain: brief green sparkle on heart icons.

---

## 7. Weather Impact Tables (Survival)

### 7.1 Rain

| Effect | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| Growth Bonus | +30% | +30% | +30% | +30% |
| Flood Risk (water tiles expand by 1) | None | 5% chance/rain event | 15% chance | 25% chance |
| Path Mud (speed -20% on paths) | None | None | Yes | Yes |
| Visibility Reduction | None | None | None | Slight fog overlay |

### 7.2 Drought

| Effect | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| Growth Penalty | -20% | -50% | -70% | -80% |
| Stamina Drain Multiplier | 1.0x | 1.5x | 2.0x | 2.5x |
| Tree Death Risk (seedlings) | None | None | 5%/game-day | 10%/game-day |
| Dehydration Damage | None | 0.15/min | 0.3/min | 0.5/min |
| Water Tile Shrink | None | None | 1 tile/drought | 2 tiles/drought |

### 7.3 Windstorm

| Effect | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| Tree Damage (stage 0-1) | 5% | 10% | 20% | 25% |
| Structure HP Loss | 0 | 1 HP | 2 HP | 3 HP |
| Player Debris Damage | 0.25/hit | 0.5/hit | 1.0/hit | 1.5/hit |
| Debris Hit Chance (per check) | 5% | 10% | 20% | 30% |
| Movement Speed Penalty | None | -10% | -20% | -30% |

### 7.4 Frost (Winter-specific, new weather type for Survival)

| Effect | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| Cold Damage (unsheltered, night) | 0.25/min | 0.5/min | 1.0/min | 1.5/min |
| Water Tile Freeze | None | 50% freeze | 100% freeze | 100% freeze |
| Non-evergreen Growth | 0% (dormant) | 0% (dormant) | 0% (dormant) | 0% (dormant) |
| Harvest Yield Penalty | None | -20% | -40% | -60% |

### 7.5 Heatwave (Summer-specific, new weather type for Survival)

| Effect | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| Stamina Drain Multiplier | 1.2x | 1.5x | 2.0x | 2.5x |
| Dehydration Damage | 0.05/min | 0.15/min | 0.3/min | 0.5/min |
| Fire Risk (Old Growth trees) | None | None | 2%/game-day | 5%/game-day |
| Duration Multiplier | 0.5x | 1.0x | 1.5x | 2.0x |

---

## 8. Seasonal Danger Tables

### 8.1 Spring

| Aspect | Exploration | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|---|
| **Growth Bonus** | +50% | +50% | +50% | +50% | +50% |
| **Rain Frequency** | 30% (visual) | 30% | 30% | 35% | 40% |
| **Flood Risk** | None | None | Low | Medium | High |
| **Unique Threat** | None | None | Flash floods (lose 1 path tile) | Flash floods (lose 2 tiles) | Flash floods (lose 3 tiles) |
| **Preparation** | None needed | None needed | Build drainage (well) | Elevate structures | Stockpile, elevate |
| **Overall** | Beautiful renewal | Gentle renewal | Balanced growth | Plan for water management | Active flood defense |

### 8.2 Summer

| Aspect | Exploration | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|---|
| **Growth Bonus** | 1.0x | 1.0x | 1.0x | 0.9x | 0.8x |
| **Drought Frequency** | 25% (visual) | 20% | 25% | 35% | 45% |
| **Heatwave** | Visual shimmer | Rare | Occasional | Frequent | Constant risk |
| **Dehydration** | None | Minimal | Moderate | Severe | Critical |
| **Harvest** | Abundant | Abundant | Normal | Reduced | Scarce |
| **Preparation** | Enjoy the sun | Have some fruit | Water sources, shade | Rain catchers, reserves | Full shelter, massive stockpile |
| **Overall** | Warm and productive | Easy warmth | Balanced challenge | Heat management game | Brutal survival |

### 8.3 Autumn

| Aspect | Exploration | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|---|
| **Growth Bonus** | 0.8x | 0.8x | 0.8x | 0.7x | 0.6x |
| **Harvest Bonus** | +20% all yields | +20% | +10% | Normal | -10% |
| **Windstorm Frequency** | 20% (visual) | 15% | 20% | 30% | 40% |
| **Unique Threat** | None | None | Early frost (last 5 days) | Early frost (last 10 days) | Early frost (last 15 days) |
| **Preparation** | Enjoy the colors | Light stockpiling | Stockpile for winter | Heavy stockpiling, shelter repair | Everything must be ready |
| **Overall** | Golden beauty | Gentle harvest | The calm before winter | Racing the clock | Desperate preparation |

### 8.4 Winter

| Aspect | Exploration | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|---|
| **Growth** | 0% (dormant, visual) | 0% non-evergreen | 0% non-evergreen | 0% non-evergreen | 0% non-evergreen |
| **Cold Damage** | None | 0.25/min outdoors at night | 0.5/min outdoors at night | 1.0/min outdoors | 1.5/min outdoors |
| **Frost** | Pretty snow overlay | Light frost | Full frost, water freezes | Deep frost, extended | Permafrost |
| **Food Scarcity** | Normal harvests | Reduced harvests | No new fruit | No new fruit, -25% stored | No new fruit, -50% stored decay |
| **Day Length** | Normal | Shortened (70%) | Shortened (60%) | Shortened (50%) | Shortened (40%) |
| **Survival Strategy** | Watch the snow | Stay near campfire | Shelter is essential | Bunker mode | Every resource counts |
| **Overall** | Cozy winter wonderland | Mild chill | Real winter challenge | Harsh survival test | The ultimate test |

---

## 9. Structure Roles by Mode

### 9.1 Shared Structures (Both Modes)

All existing structures remain available in both modes. Their **functional role** changes:

| Structure | Exploration Role | Survival Role |
|---|---|---|
| **Wooden Fence** | Aesthetic boundary | Wind barrier (blocks debris damage to trees within 2 tiles) |
| **Well** | Growth boost (decorative bonus) | Growth boost + water source (prevents dehydration within radius) |
| **Irrigation** | Growth boost | Growth boost + drought resistance (trees in radius immune to drought death) |
| **Sprinkler** | Growth boost | Growth boost + full drought immunity + fire suppression |
| **Greenhouse** | Growth boost | Growth boost + shelter (protects player from weather inside footprint) |
| **Conservatory** | Growth boost + aesthetic | Growth boost + full shelter + cold immunity inside |
| **Biodome** | Growth boost + prestige | Growth boost + full shelter + climate control (no seasonal penalties inside) |
| **Tool Shed** | Stamina regen | Stamina regen + basic shelter |
| **Workshop** | Stamina regen | Stamina regen + shelter + tool repair |
| **Forge** | Stamina regen | Stamina regen + shelter + warmth source (cold immunity in radius) |
| **Market Stall** | Harvest boost | Harvest boost + food preservation (reduces winter food decay) |
| **Trading Post** | Harvest boost | Harvest boost + resource safe storage |
| **Grand Market** | Harvest boost | Harvest boost + resource safe storage + trade bonus |
| **Bench** | Decorative | Resting spot (+0.1 heart regen when sitting) |

### 9.2 New Survival-Specific Structures

These structures are only visible/buildable in Survival mode:

| Structure | Cost | Level | Effect | Description |
|---|---|---|---|---|
| **Campfire** | 10 timber, 5 sap | 2 | Warmth (cold immunity r=2) + heart regen (r=2) | "A crackling fire that warms body and spirit." |
| **Rain Collector** | 15 timber, 10 sap | 4 | Water source (r=3) during drought | "Catches rainfall for dry times." |
| **Storage Chest** | 20 timber | 3 | Safe storage (resources stored here are not lost on defeat) | "A sturdy chest to safeguard your harvest." |
| **Windbreak Wall** | 25 timber, 5 sap | 5 | Blocks wind debris in a 3-wide line behind it | "A reinforced wall that shields against storms." |
| **Herb Garden** | 15 sap, 10 fruit | 7 | Produces 1 herbal remedy per 2 game days | "Medicinal plants for tough times." |

### 9.3 Structure Health (Survival Only)

In Survival mode, structures have HP and can degrade:

| Structure Tier | Base HP | Degradation Source |
|---|---|---|
| Small (fence, bench, campfire) | 10 HP | Windstorm: -1 to -3 HP per storm (tier-dependent) |
| Medium (well, shed, market stall) | 20 HP | Windstorm: -1 to -3 HP. Season wear: -1 HP per season. |
| Large (greenhouse, workshop, trading post) | 30 HP | Windstorm: -1 to -3 HP. Season wear: -1 HP per season. |
| Grand (biodome, forge, grand market) | 50 HP | Windstorm: -2 to -5 HP. Season wear: -1 HP per season. |

**Repair:** Interact with structure + spend 25% of original build cost to restore full HP.

**Destruction:** At 0 HP, structure collapses. Grid cells freed. 25% of materials recovered as dropped resources.

**Degradation rate scaling:**

| Tier | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|
| Degradation multiplier | 0x (disabled) | 1x | 2x | 3x |

---

## 10. Difficulty Multiplier Matrix

### 10.1 Complete Multiplier Table

| Multiplier | Exploration | Gentle | Standard | Harsh | Ironwood |
|---|---|---|---|---|---|
| **growthSpeedMult** | 1.5 | 1.0 | 0.8 | 0.6 | 0.4 |
| **resourceYieldMult** | 1.5 | 1.0 | 0.85 | 0.6 | 0.4 |
| **seedCostMult** | 0.7 | 0.9 | 1.0 | 1.3 | 1.8 |
| **structureCostMult** | 0.5 | 0.9 | 1.0 | 1.3 | 1.8 |
| **harvestCycleMult** | 0.7 | 0.9 | 1.0 | 1.3 | 1.8 |
| **staminaDrainMult** | 0.5 | 0.8 | 1.0 | 1.4 | 2.0 |
| **staminaRegenMult** | 2.5 | 1.2 | 1.0 | 0.7 | 0.4 |
| **maxStamina** | 200 | 120 | 100 | 80 | 60 |
| **weatherSeverityMult** | 0.0 | 0.5 | 1.0 | 1.5 | 2.0 |
| **seasonLengthDays** | 120 | 90 | 75 | 60 | 45 |
| **maxHearts** | N/A | 7 | 5 | 3 | 3 |
| **heartRegenRate** | N/A | 0.5/min | 0.25/min | 0.1/min | 0.05/min |
| **dawnRenewalHearts** | N/A | 2.0 | 1.0 | 0.5 | 0.0 |
| **exposureDriftRate** | 0.0 | 0.3 | 0.6 | 1.0 | 1.5 |
| **windstormDamageChance** | 0.0 | 0.05 | 0.10 | 0.20 | 0.25 |
| **droughtGrowthPenalty** | 1.0 | 0.8 | 0.5 | 0.3 | 0.2 |
| **rainGrowthBonus** | 1.0 | 1.3 | 1.3 | 1.3 | 1.3 |
| **buildingDegradationMult** | 0 | 0 | 1 | 2 | 3 |
| **cropDiseaseEnabled** | false | false | false | true | true |
| **playerConditionsEnabled** | false | false | false | true | true |
| **structureHPEnabled** | false | false | true | true | true |
| **floodRiskMult** | 0.0 | 0.0 | 0.5 | 1.0 | 1.5 |
| **foodDecayMult** | 0.0 | 0.0 | 0.0 | 0.25 | 0.5 |
| **xpMult** | 1.0 | 1.0 | 1.2 | 1.5 | 2.0 |
| **unlockLevelMult** | 0.7 | 1.0 | 1.0 | 1.0 | 1.0 |
| **structureLevelMult** | 0.5 | 1.0 | 1.0 | 1.0 | 1.0 |
| **startingResources.timber** | 50 | 20 | 15 | 8 | 3 |
| **startingResources.sap** | 30 | 10 | 8 | 4 | 2 |
| **startingResources.fruit** | 20 | 10 | 8 | 4 | 2 |
| **startingResources.acorns** | 30 | 15 | 10 | 6 | 3 |
| **startingSeeds.white-oak** | 15 | 10 | 8 | 5 | 3 |
| **permadeath** | "off" | "optional" | "optional" | "optional" | "forced" |
| **defeatResourceLoss** | 0.0 | 0.25 | 0.50 | 1.0 | N/A (permadeath) |
| **unconsciousnessHoursLost** | 0 | 6 | 12 | 24 | N/A |

---

## 11. Config JSON Schema

### 11.1 New File: `config/game/gameModes.json`

This replaces `config/game/difficulty.json`.

```json
{
  "modes": [
    {
      "id": "exploration",
      "name": "Exploration",
      "tagline": "Tend your grove in peace",
      "description": "No danger, no pressure. Pure creativity, building, and growing. Weather is visual only. Seasons change aesthetically but never threaten.",
      "icon": "leaf",
      "color": "#4CAF50",
      "heartsEnabled": false,
      "survivalTiers": null,

      "growthSpeedMult": 1.5,
      "resourceYieldMult": 1.5,
      "seedCostMult": 0.7,
      "structureCostMult": 0.5,
      "harvestCycleMult": 0.7,
      "staminaDrainMult": 0.5,
      "staminaRegenMult": 2.5,
      "maxStamina": 200,
      "weatherSeverityMult": 0.0,
      "seasonLengthDays": 120,
      "windstormDamageChance": 0.0,
      "droughtGrowthPenalty": 1.0,
      "rainGrowthBonus": 1.0,
      "buildingDegradationMult": 0,
      "cropDiseaseEnabled": false,
      "playerConditionsEnabled": false,
      "structureHPEnabled": false,
      "floodRiskMult": 0.0,
      "foodDecayMult": 0.0,
      "xpMult": 1.0,
      "unlockLevelMult": 0.7,
      "structureLevelMult": 0.5,
      "exposureDriftRate": 0.0,
      "permadeath": "off",
      "defeatResourceLoss": 0.0,
      "unconsciousnessHoursLost": 0,
      "startingResources": { "timber": 50, "sap": 30, "fruit": 20, "acorns": 30 },
      "startingSeeds": { "white-oak": 15 }
    },
    {
      "id": "survival",
      "name": "Survival",
      "tagline": "Nature is beautiful and dangerous",
      "description": "Weather impacts gameplay. Hearts track your health. Scarce resources test your planning. Structures protect you from the elements.",
      "icon": "shield",
      "color": "#37474F",
      "heartsEnabled": true,
      "survivalTiers": ["gentle", "standard", "harsh", "ironwood"]
    }
  ],
  "survivalTiers": [
    {
      "id": "gentle",
      "name": "Gentle",
      "tagline": "A soft introduction",
      "description": "7 hearts, mild weather, forgiving stamina. A good first survival experience.",
      "icon": "sprout",
      "color": "#66BB6A",

      "maxHearts": 7,
      "heartRegenPerMin": 0.5,
      "dawnRenewalHearts": 2.0,

      "growthSpeedMult": 1.0,
      "resourceYieldMult": 1.0,
      "seedCostMult": 0.9,
      "structureCostMult": 0.9,
      "harvestCycleMult": 0.9,
      "staminaDrainMult": 0.8,
      "staminaRegenMult": 1.2,
      "maxStamina": 120,
      "weatherSeverityMult": 0.5,
      "seasonLengthDays": 90,
      "windstormDamageChance": 0.05,
      "droughtGrowthPenalty": 0.8,
      "rainGrowthBonus": 1.3,
      "buildingDegradationMult": 0,
      "cropDiseaseEnabled": false,
      "playerConditionsEnabled": false,
      "structureHPEnabled": false,
      "floodRiskMult": 0.0,
      "foodDecayMult": 0.0,
      "xpMult": 1.0,
      "unlockLevelMult": 1.0,
      "structureLevelMult": 1.0,
      "exposureDriftRate": 0.3,
      "permadeath": "optional",
      "defeatResourceLoss": 0.25,
      "unconsciousnessHoursLost": 6,
      "startingResources": { "timber": 20, "sap": 10, "fruit": 10, "acorns": 15 },
      "startingSeeds": { "white-oak": 10 },

      "damageScaling": {
        "coldExposure": 0.25,
        "heatExposure": 0.1,
        "exhaustion": 0.5,
        "windstormDebris": 0.25,
        "starvation": 0.1,
        "dehydration": 0.05
      }
    },
    {
      "id": "standard",
      "name": "Standard",
      "tagline": "The intended experience",
      "description": "5 hearts, balanced challenge. Weather matters, preparation pays off.",
      "icon": "sun",
      "color": "#2196F3",

      "maxHearts": 5,
      "heartRegenPerMin": 0.25,
      "dawnRenewalHearts": 1.0,

      "growthSpeedMult": 0.8,
      "resourceYieldMult": 0.85,
      "seedCostMult": 1.0,
      "structureCostMult": 1.0,
      "harvestCycleMult": 1.0,
      "staminaDrainMult": 1.0,
      "staminaRegenMult": 1.0,
      "maxStamina": 100,
      "weatherSeverityMult": 1.0,
      "seasonLengthDays": 75,
      "windstormDamageChance": 0.10,
      "droughtGrowthPenalty": 0.5,
      "rainGrowthBonus": 1.3,
      "buildingDegradationMult": 1,
      "cropDiseaseEnabled": false,
      "playerConditionsEnabled": false,
      "structureHPEnabled": true,
      "floodRiskMult": 0.5,
      "foodDecayMult": 0.0,
      "xpMult": 1.2,
      "unlockLevelMult": 1.0,
      "structureLevelMult": 1.0,
      "exposureDriftRate": 0.6,
      "permadeath": "optional",
      "defeatResourceLoss": 0.50,
      "unconsciousnessHoursLost": 12,
      "startingResources": { "timber": 15, "sap": 8, "fruit": 8, "acorns": 10 },
      "startingSeeds": { "white-oak": 8 },

      "damageScaling": {
        "coldExposure": 0.5,
        "heatExposure": 0.25,
        "exhaustion": 1.0,
        "windstormDebris": 0.5,
        "starvation": 0.25,
        "dehydration": 0.15
      }
    },
    {
      "id": "harsh",
      "name": "Harsh",
      "tagline": "Nature fights back",
      "description": "3 hearts, severe weather, scarce resources. Every decision counts.",
      "icon": "storm",
      "color": "#FF9800",

      "maxHearts": 3,
      "heartRegenPerMin": 0.1,
      "dawnRenewalHearts": 0.5,

      "growthSpeedMult": 0.6,
      "resourceYieldMult": 0.6,
      "seedCostMult": 1.3,
      "structureCostMult": 1.3,
      "harvestCycleMult": 1.3,
      "staminaDrainMult": 1.4,
      "staminaRegenMult": 0.7,
      "maxStamina": 80,
      "weatherSeverityMult": 1.5,
      "seasonLengthDays": 60,
      "windstormDamageChance": 0.20,
      "droughtGrowthPenalty": 0.3,
      "rainGrowthBonus": 1.3,
      "buildingDegradationMult": 2,
      "cropDiseaseEnabled": true,
      "playerConditionsEnabled": true,
      "structureHPEnabled": true,
      "floodRiskMult": 1.0,
      "foodDecayMult": 0.25,
      "xpMult": 1.5,
      "unlockLevelMult": 1.0,
      "structureLevelMult": 1.0,
      "exposureDriftRate": 1.0,
      "permadeath": "optional",
      "defeatResourceLoss": 1.0,
      "unconsciousnessHoursLost": 24,
      "startingResources": { "timber": 8, "sap": 4, "fruit": 4, "acorns": 6 },
      "startingSeeds": { "white-oak": 5 },

      "damageScaling": {
        "coldExposure": 1.0,
        "heatExposure": 0.5,
        "exhaustion": 1.5,
        "windstormDebris": 1.0,
        "starvation": 0.5,
        "dehydration": 0.3
      }
    },
    {
      "id": "ironwood",
      "name": "Ironwood",
      "tagline": "One bad winter ends it all",
      "description": "3 hearts, permadeath. Maximum severity. The ultimate test of grove mastery.",
      "icon": "skull",
      "color": "#9C27B0",

      "maxHearts": 3,
      "heartRegenPerMin": 0.05,
      "dawnRenewalHearts": 0.0,

      "growthSpeedMult": 0.4,
      "resourceYieldMult": 0.4,
      "seedCostMult": 1.8,
      "structureCostMult": 1.8,
      "harvestCycleMult": 1.8,
      "staminaDrainMult": 2.0,
      "staminaRegenMult": 0.4,
      "maxStamina": 60,
      "weatherSeverityMult": 2.0,
      "seasonLengthDays": 45,
      "windstormDamageChance": 0.25,
      "droughtGrowthPenalty": 0.2,
      "rainGrowthBonus": 1.3,
      "buildingDegradationMult": 3,
      "cropDiseaseEnabled": true,
      "playerConditionsEnabled": true,
      "structureHPEnabled": true,
      "floodRiskMult": 1.5,
      "foodDecayMult": 0.5,
      "xpMult": 2.0,
      "unlockLevelMult": 1.0,
      "structureLevelMult": 1.0,
      "exposureDriftRate": 1.5,
      "permadeath": "forced",
      "defeatResourceLoss": 1.0,
      "unconsciousnessHoursLost": 0,
      "startingResources": { "timber": 3, "sap": 2, "fruit": 2, "acorns": 3 },
      "startingSeeds": { "white-oak": 3 },

      "damageScaling": {
        "coldExposure": 1.5,
        "heatExposure": 0.75,
        "exhaustion": 2.0,
        "windstormDebris": 1.5,
        "starvation": 0.75,
        "dehydration": 0.5
      }
    }
  ]
}
```

### 11.2 TypeScript Types

New file: `game/config/gameModes.ts`

```typescript
export type GameMode = "exploration" | "survival";
export type SurvivalTier = "gentle" | "standard" | "harsh" | "ironwood";

export interface DamageScaling {
  coldExposure: number;
  heatExposure: number;
  exhaustion: number;
  windstormDebris: number;
  starvation: number;
  dehydration: number;
}

export interface ModeConfig {
  // Identity
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;

  // Hearts
  heartsEnabled: boolean;
  maxHearts: number;
  heartRegenPerMin: number;
  dawnRenewalHearts: number;

  // Economy
  growthSpeedMult: number;
  resourceYieldMult: number;
  seedCostMult: number;
  structureCostMult: number;
  harvestCycleMult: number;

  // Stamina
  staminaDrainMult: number;
  staminaRegenMult: number;
  maxStamina: number;

  // Weather
  weatherSeverityMult: number;
  windstormDamageChance: number;
  droughtGrowthPenalty: number;
  rainGrowthBonus: number;

  // Time
  seasonLengthDays: number;

  // Survival mechanics
  buildingDegradationMult: number;
  cropDiseaseEnabled: boolean;
  playerConditionsEnabled: boolean;
  structureHPEnabled: boolean;
  floodRiskMult: number;
  foodDecayMult: number;
  exposureDriftRate: number;

  // Progression
  xpMult: number;
  unlockLevelMult: number;
  structureLevelMult: number;

  // Defeat
  permadeath: "off" | "optional" | "forced";
  defeatResourceLoss: number;
  unconsciousnessHoursLost: number;

  // Starting state
  startingResources: Record<string, number>;
  startingSeeds: Record<string, number>;

  // Damage (survival only)
  damageScaling: DamageScaling;
}

/**
 * Returns the resolved ModeConfig for the current game session.
 * For Exploration: returns the exploration config directly.
 * For Survival: merges survival base with the selected tier.
 */
export function getModeConfig(
  mode: GameMode,
  tier: SurvivalTier | null
): ModeConfig;

/**
 * Returns the exploration mode definition (for UI display).
 */
export function getExplorationDef(): { ... };

/**
 * Returns all survival tier definitions (for UI display).
 */
export function getSurvivalTiers(): { ... }[];
```

---

## 12. System Architecture

### 12.1 Design Decision: Config-Driven, Not Guard-Driven

**Chosen approach: Config-driven multipliers via `getModeConfig()`.**

Every system reads its multipliers from the resolved `ModeConfig` object. There are NO `if (mode === 'survival')` checks scattered through the codebase. Instead:

```typescript
// GOOD: Config-driven
const config = getModeConfig(store.gameMode, store.survivalTier);
const growthRate = baseRate * config.growthSpeedMult;
const staminaCost = baseCost * config.staminaDrainMult;
const damagePerMin = config.heartsEnabled ? config.damageScaling.coldExposure : 0;

// BAD: Guard-driven (do NOT do this)
if (store.gameMode === 'survival') {
  applyDamage(...)
}
```

The only legitimate guard is `config.heartsEnabled` which is a boolean from config, not a mode string check.

### 12.2 Store Changes

In `game/stores/gameStore.ts`, the `initialState` adds:

```typescript
const initialState = {
  // ... existing fields ...

  // Replace: difficulty: "normal"
  // With:
  gameMode: "exploration" as GameMode,
  survivalTier: null as SurvivalTier | null,
  permadeath: false,

  // New hearts state (only used when heartsEnabled)
  hearts: 0,       // set during resetGame based on config
  maxHearts: 0,    // set during resetGame based on config

  // Remove: difficulty field
};
```

New actions:

```typescript
// Set mode during new game creation
setGameMode(mode: GameMode, tier: SurvivalTier | null) {
  const config = getModeConfig(mode, tier);
  batch(() => {
    gameState$.gameMode.set(mode);
    gameState$.survivalTier.set(tier);
    gameState$.permadeath.set(config.permadeath === "forced");
    gameState$.hearts.set(config.maxHearts);
    gameState$.maxHearts.set(config.maxHearts);
    gameState$.maxStamina.set(config.maxStamina);
    gameState$.stamina.set(config.maxStamina);
    gameState$.resources.set(config.startingResources);
    gameState$.seeds.set(config.startingSeeds);
  });
},

// Hearts actions
setHearts(value: number) {
  gameState$.hearts.set(Math.max(0, Math.min(value, getState().maxHearts)));
},

damageHearts(amount: number, source: string) {
  const current = getState().hearts;
  const newHearts = Math.max(0, current - amount);
  batch(() => {
    gameState$.hearts.set(newHearts);
  });
  if (newHearts <= 0) {
    queueMicrotask(() => actions.handleDefeat(source));
  }
},

healHearts(amount: number) {
  const state = getState();
  gameState$.hearts.set(Math.min(state.maxHearts, state.hearts + amount));
},

handleDefeat(source: string) {
  const config = getModeConfig(getState().gameMode, getState().survivalTier);
  if (config.permadeath === "forced" || getState().permadeath) {
    // Permadeath: wipe save, return to menu
    actions.resetGame();
    showToast("Your grove returns to the wild.", "info");
  } else {
    // Unconsciousness: respawn, lose resources, skip time
    const lossRate = config.defeatResourceLoss;
    const state = getState();
    const penalizedResources = { ...state.resources };
    for (const key of Object.keys(penalizedResources)) {
      penalizedResources[key] = Math.floor(
        penalizedResources[key] * (1 - lossRate)
      );
    }
    batch(() => {
      gameState$.resources.set(penalizedResources);
      gameState$.hearts.set(Math.ceil(config.maxHearts / 2));
      gameState$.currentZoneId.set("starting-grove");
      // Time skip handled by advancing gameTimeMicroseconds
    });
    showToast(getDefeatMessage(source), "info");
  }
},
```

### 12.3 How Mode Propagates Through Systems

```
                    gameStore
                 /     |      \
          gameMode  survivalTier  permadeath
                \     |      /
                 getModeConfig()
                      |
                  ModeConfig
              /    |     |    \
           growth  weather stamina harvest
           system  system  system  system
                      |
                   hearts
                   system
                   (new)
```

Each system receives the `ModeConfig` (or the specific multiplier it needs) from the game loop:

```typescript
// In useGameLoop.ts:
const config = getModeConfig(store.gameMode, store.survivalTier);

// Growth
const growthRate = calcGrowthRate({...}) * config.growthSpeedMult;

// Weather
const weatherMult = config.weatherSeverityMult > 0
  ? getWeatherGrowthMultiplier(weather) * config.weatherSeverityMult
  : 1.0; // exploration: weather has no effect

// Stamina
const staminaCost = baseCost * config.staminaDrainMult;
regenStamina(stamina, config.maxStamina, dt, config.staminaRegenMult);

// Hearts (new system, runs only when heartsEnabled)
if (config.heartsEnabled) {
  updateHeartsSystem(config, timeState, weatherState, store);
}
```

### 12.4 New System: `game/systems/hearts.ts`

```typescript
/**
 * Hearts system -- survival-mode health management.
 *
 * Pure functions for heart damage/healing calculations.
 * Only active when ModeConfig.heartsEnabled === true.
 */

export interface HeartsContext {
  hearts: number;
  maxHearts: number;
  season: string;
  timePhase: TimePhase;
  weatherType: WeatherType;
  sheltered: boolean;
  nearCampfire: boolean;
  nearWater: boolean;
  stamina: number;
  fruitCount: number;
  daysSinceLastFruit: number;
}

export interface HeartsDelta {
  damage: number;
  healing: number;
  source: string | null;
}

/**
 * Calculate hearts change for this frame.
 * Returns net damage/healing and the primary source.
 */
export function calculateHeartsDelta(
  ctx: HeartsContext,
  config: ModeConfig,
  dt: number
): HeartsDelta;

/**
 * Check if dawn renewal should trigger (called on day transition).
 */
export function getDawnRenewal(config: ModeConfig): number;
```

---

## 13. System Modification List

### 13.1 Files to Create

| File | Purpose |
|---|---|
| `config/game/gameModes.json` | Mode + tier definitions (replaces `difficulty.json`) |
| `game/config/gameModes.ts` | TypeScript accessor: `getModeConfig()`, types |
| `game/config/gameModes.test.ts` | Tests for config loading and resolution |
| `game/systems/hearts.ts` | Hearts damage/healing calculation (pure functions) |
| `game/systems/hearts.test.ts` | Tests for hearts system |
| `game/ui/ModeSelect.tsx` | Mode selection screen component |
| `game/ui/SurvivalTierModal.tsx` | Survival tier selection bottom-sheet |
| `game/ui/HeartsDisplay.tsx` | Pixel-art hearts HUD component |
| `game/ui/DefeatScreen.tsx` | Defeat/unconsciousness overlay |

### 13.2 Files to Modify

| File | Changes |
|---|---|
| **`config/game/difficulty.json`** | DELETE (replaced by `gameModes.json`) |
| **`game/stores/gameStore.ts`** | Replace `difficulty` field with `gameMode`, `survivalTier`, `permadeath`, `hearts`, `maxHearts`. Add hearts actions. Modify `resetGame()` to accept mode+tier. Modify `performPrestige()` to preserve mode. |
| **`game/ecs/world.ts`** | Add `HealthComponent` to `Entity`. Add `health` to farmer entity. |
| **`game/hooks/useGameLoop.ts`** | Import `getModeConfig`. Pass config multipliers to growth, stamina, weather systems. Add hearts system tick. Add dawn renewal check. Add shelter proximity check. |
| **`game/systems/growth.ts`** | `calcGrowthRate` signature unchanged (species difficulty stays). Game loop applies `config.growthSpeedMult` externally. |
| **`game/systems/stamina.ts`** | `regenStamina` already takes `regenMult` param -- no changes needed. Game loop passes `config.staminaRegenMult`. |
| **`game/systems/weather.ts`** | `getWeatherGrowthMultiplier` now takes an optional severity multiplier. Add drought penalty from config. Add frost/heatwave weather types. |
| **`game/systems/harvest.ts`** | `computeYieldMultiplier` takes optional `yieldMult` from config. |
| **`game/systems/time.ts`** | `computeTimeState` already takes `seasonLength` param. Game loop passes `config.seasonLengthDays`. |
| **`game/systems/levelUnlocks.ts`** | Apply `config.unlockLevelMult` to unlock level checks. |
| **`game/structures/StructureManager.ts`** | Apply `config.structureCostMult` and `config.structureLevelMult`. Add structure HP tracking for survival. Add new survival structures to catalog. |
| **`game/structures/data/structures.json`** | Add campfire, rain collector, storage chest, windbreak wall, herb garden entries. |
| **`game/ui/HUD.tsx`** | Conditionally render `HeartsDisplay` when `heartsEnabled`. |
| **`game/ui/GameUI.tsx`** | Add hearts display to HUD layout. |
| **`game/actions/GameActions.ts`** | `spendToolStamina` checks exhaustion damage (0 stamina + tool action = heart damage). |
| **`game/db/schema.ts`** | Add `gameMode`, `survivalTier`, `hearts`, `maxHearts` columns. |
| **`game/db/migrations/`** | New migration for mode columns. |
| **`game/systems/offlineGrowth.ts`** | Apply `config.growthSpeedMult` to offline calculation. |

### 13.3 Files Unchanged

These files need NO modification:

| File | Why |
|---|---|
| `game/systems/time.ts` | Already parameterized with `seasonLength`. |
| `game/systems/stamina.ts` | Already takes `regenMult` parameter. |
| `game/utils/seedRNG.ts` | No mode dependency. |
| `game/utils/treeMeshBuilder.ts` | Visual, no mode dependency. |
| `game/utils/spsTreeGenerator.ts` | Visual, no mode dependency. |
| `game/systems/prestige.ts` | Prestige works identically in both modes. |
| `game/systems/achievements.ts` | Achievements are shared across modes. |
| `game/systems/quests.ts` | Quests are shared. |
| `game/quests/*` | Quest chains are mode-independent. |
| `game/events/*` | Events and festivals are shared. |
| `game/config/species.ts` | Species data unchanged. |
| `game/config/resources.ts` | Resource types unchanged. |

---

## 14. Game Feel Analysis

### 14.1 Why Exploration Mode Is Fun On Its Own Terms

**The core loop is creative, not competitive.** When you remove stakes (death, resource loss, weather penalties), what remains must be intrinsically satisfying. Exploration mode achieves this through:

1. **The Collector's Dopamine.** With 15 species, a codex to fill, NPC quest chains to complete, and achievements to unlock, there is always something to chase. The reduced unlock levels mean new species arrive frequently -- every few play sessions bring a new tree to discover.

2. **The Builder's Canvas.** With structure costs halved and level requirements cut by 50%, the grove becomes a creative playground from the start. Players can design intricate layouts, experiment with structure placement for visual effect, and build their dream grove without grinding for materials.

3. **The Gardener's Peace.** Watching trees grow is genuinely calming when you know nothing can destroy them. The 1.5x growth speed means visible progress every session. Weather adds ambiance (rain pattering, snow falling) without anxiety. This is the "cozy game" promise delivered.

4. **Not "Easy Mode."** The critical distinction: Exploration is not a watered-down Survival. It is a different game with different goals. You don't "beat" Exploration by being good at Survival mechanics. You "beat" it by filling your codex, completing every quest chain, reaching prestige, and building a grove you're proud of. The satisfaction is achievement-based, not challenge-based.

5. **Session Respect.** For the target audience (mobile, 3-15 minute commute sessions), Exploration mode guarantees that every session ends with progress. You never open the app to find disaster. This is not "removing consequences" -- it is respecting the player's time.

### 14.2 Why Survival Mode Is Fun On Its Own Terms

**The core loop is strategic, not punishing.** Survival adds stakes that make decisions meaningful, but the game remains cozy at its heart -- you are tending a grove, not fighting monsters. The fun comes from:

1. **The Planner's Satisfaction.** Winter is coming. You know it. The entire autumn becomes a game of preparation: stockpile fruit, repair structures, ensure shelter is adequate. When you survive your first winter, the satisfaction is immense -- not because it was hard, but because your plan worked.

2. **Structures Matter.** In Exploration, structures are decorative bonuses. In Survival, a campfire is the difference between life and death on a winter night. A rain collector means your trees survive the drought. Every structure placement is a meaningful decision with tangible payoff.

3. **Weather as Narrative.** When rain affects your crops and windstorms threaten your seedlings, weather becomes a character in the story. You develop a relationship with the seasons -- welcoming spring's growth, dreading summer's droughts, racing autumn's clock, surviving winter's cold.

4. **Earned Comfort.** The first time you build a shelter, light a campfire, and watch a blizzard rage outside while your hearts slowly regenerate -- that is peak cozy. Comfort earned through adversity is more satisfying than comfort given freely.

5. **The Difficulty Ladder.** Gentle -> Standard -> Harsh -> Ironwood provides a natural progression. A player who masters Gentle will be curious about Standard. A player who conquers Harsh will wonder if they can survive Ironwood. The ladder creates long-term engagement without forcing anyone to climb it.

6. **XP Reward Scaling.** Harder tiers give 1.5x-2.0x XP. This means Survival players reach new species and prestige faster through challenge, not grinding. The reward matches the risk.

### 14.3 Mode Interaction with Existing Systems

| System | Exploration Feel | Survival Feel |
|---|---|---|
| **Prestige** | A creative reset -- "What new grove can I design with prestige species?" | A challenge reset -- "Can I survive again with Crystal Oak this time?" |
| **NPC Quests** | Relaxed chain completion, focus on story | Same quests, but resource constraints make rewards more valuable |
| **Codex** | Primary endgame -- fill every entry | Secondary goal -- knowledge helps survival |
| **Trading** | Casual commerce, market is fun side activity | Critical system -- trade for scarce winter supplies |
| **Festivals** | Celebration events, bonus resources | Lifeline events -- festival rewards can save a bad season |
| **Building** | Creative sandbox, aesthetic expression | Strategic infrastructure, survival necessity |

---

## Appendix A: Migration Path

### Step 1: Config Layer (no gameplay changes)
- Create `config/game/gameModes.json` and `game/config/gameModes.ts`.
- Add `getModeConfig()` function.
- Add tests.

### Step 2: Store Integration
- Add `gameMode`, `survivalTier`, `hearts`, `maxHearts` to store.
- Add mode-aware `resetGame()`.
- Deprecate `difficulty` field (keep for save compat, ignore in logic).
- Add DB migration.

### Step 3: System Wiring
- Wire `getModeConfig()` into `useGameLoop.ts`.
- Pass multipliers to growth, stamina, weather, harvest systems.
- All existing systems work with exploration defaults (= current behavior + slight buffs).

### Step 4: Mode Selection UI
- Create `ModeSelect.tsx` and `SurvivalTierModal.tsx`.
- Wire into new game flow.

### Step 5: Hearts System
- Create `hearts.ts` system.
- Add `HeartsDisplay.tsx` HUD component.
- Add `DefeatScreen.tsx`.
- Wire into game loop.

### Step 6: Survival Structures
- Add campfire, rain collector, storage chest, windbreak, herb garden to `structures.json`.
- Add structure HP system.
- Wire shelter/proximity checks.

### Step 7: Weather Expansion
- Add frost and heatwave weather types (survival only).
- Wire seasonal danger logic.

### Step 8: Polish
- Defeat animations, flavor text.
- Achievement for surviving first winter.
- Tutorial adjustments per mode.
- Test at all 4 survival tiers.

---

## Appendix B: Achievement Additions

| ID | Name | Condition | Mode |
|---|---|---|---|
| `first-winter` | "Winter's End" | Survive your first winter | Survival only |
| `ironwood-year` | "Ironwood Veteran" | Survive a full year on Ironwood | Survival only |
| `no-damage-season` | "Untouched" | Complete a season without taking heart damage | Survival only |
| `full-shelter` | "Home Sweet Home" | Build a shelter with campfire, well, and storage | Survival only |
| `codex-complete-explore` | "Living Encyclopedia" | Fill every codex entry | Exploration only |
| `all-structures-explore` | "Master Builder" | Place every structure type | Exploration only |

---

*End of design document.*
