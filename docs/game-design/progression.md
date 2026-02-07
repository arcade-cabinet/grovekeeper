# Progression

Progression in Grovekeeper spans three interconnected systems: XP and levels, achievements, and prestige. Each provides short-term, mid-term, and long-term goals respectively.

## XP and Levels

### XP Sources

XP is earned from all core actions:

- Planting a tree
- Watering a tree
- Harvesting a tree
- Completing quests
- Trees reaching maturity milestones

Cherry Blossom's Beauty Aura grants +10% XP for actions within 1 tile; Flame Maple extends this to 2 tiles. Prestige XP multiplier is applied on top (1.1x at prestige 1, scaling up).

### XP Formula

Defined in `src/game/stores/gameStore.ts`:

```
xpToNext(level) = 100 + max(0, (level - 2) * 50) + floor((level - 1) / 5) * 200
```

| Level | XP to Next | Cumulative XP |
|-------|-----------|---------------|
| 1 | 100 | 0 |
| 2 | 100 | 100 |
| 3 | 150 | 200 |
| 4 | 200 | 350 |
| 5 | 450 | 550 |
| 6 | 300 | 1,000 |
| 7 | 350 | 1,300 |
| 8 | 400 | 1,650 |
| 9 | 450 | 2,050 |
| 10 | 900 | 2,500 |

The formula has a base of 100 XP, linear scaling of +50 per level, and a +200 step every 5 levels. The `levelFromXp(totalXp)` function iterates through levels to find the current level from cumulative XP.

### Level Unlocks

Defined in `src/game/systems/levelUnlocks.ts`:

| Level | Species Unlocked | Tools Unlocked |
|-------|-----------------|----------------|
| 1 | White Oak | Trowel, Watering Can |
| 2 | Weeping Willow | Almanac |
| 3 | Elder Pine | Pruning Shears |
| 4 | -- | Seed Pouch |
| 5 | Cherry Blossom | Shovel |
| 6 | Ghost Birch | -- |
| 7 | -- | Axe |
| 8 | Redwood | -- |
| 9 | Silver Birch | -- |
| 10 | Flame Maple | Compost Bin |
| 11 | -- | Rain Catcher |
| 12 | Baobab | -- |
| 13 | -- | Fertilizer Spreader |
| 14 | Ironbark | -- |
| 16 | -- | Scarecrow |
| 18 | Golden Apple | -- |
| 20 | -- | Grafting Tool |
| 22 | Mystic Fern | -- |
| 25 | (prestige species) | -- |

On level-up, `checkNewUnlocks(oldLevel, newLevel)` returns all species and tools earned in the level range. Toast notifications are displayed via `queueMicrotask()` to avoid side effects during Zustand state updates.

## Achievements

15 achievements defined in `src/game/systems/achievements.ts`. The checker is a pure function that receives a context object and returns newly earned achievement IDs.

### Full Achievement List

| # | ID | Name | Trigger |
|---|-----|------|---------|
| 1 | `first-seed` | First Seed | Plant 1 tree |
| 2 | `seed-spreader` | Seed Spreader | Plant 50 trees (cumulative) |
| 3 | `forest-founder` | Forest Founder | Plant 200 trees (cumulative) |
| 4 | `one-of-each` | One of Each | Plant all 12 base species at least once |
| 5 | `patient-gardener` | Patient Gardener | Grow any tree to Mature (stage 3) |
| 6 | `old-growth-guardian` | Old Growth Guardian | Grow any tree to Old Growth (stage 4) |
| 7 | `timber-baron` | Timber Baron | Accumulate 1,000 lifetime timber |
| 8 | `sap-collector` | Sap Collector | Accumulate 500 lifetime sap |
| 9 | `the-giving-tree` | The Giving Tree | Harvest 500 lifetime fruit |
| 10 | `canopy-complete` | Canopy Complete | Fill an entire grid row with mature+ trees |
| 11 | `full-grove` | Full Grove | Fill the entire grid with trees |
| 12 | `biodiversity` | Biodiversity | Have 5+ species growing simultaneously |
| 13 | `seasonal-veteran` | Seasonal Veteran | Experience all 4 seasons |
| 14 | `enchanted-grove` | Enchanted Grove | Have 5 Old Growth trees simultaneously |
| 15 | `new-beginnings` | New Beginnings | Prestige for the first time |

### Achievement Checker

`checkAchievements(ctx: AchievementCheckContext)` is called periodically from the game loop. The context includes:

- `treesPlanted`, `treesMatured`, `treesHarvested` (cumulative counters)
- `lifetimeResources` (keyed by resource type)
- `speciesPlanted` (distinct species IDs ever planted)
- `seasonsExperienced` (distinct seasons experienced)
- `currentTreeData` (snapshot of all trees on the grid with speciesId, stage, gridX, gridZ)
- `gridSize` (current grid dimension)
- `unlockedAchievements` (already earned, excluded from results)
- `hasPrestiged` (boolean)

The function returns an array of newly earned achievement IDs. The caller persists them via `unlockAchievement(id)` and triggers the popup via `showAchievement()`.

### Achievement UI

- **Popup:** `AchievementPopup.tsx` displays a gold border with sparkle animation and auto-dismisses after a few seconds.
- **List:** All 15 achievements are listed in the Pause Menu, showing earned vs locked status.

## Prestige System

Defined in `src/game/systems/prestige.ts`. Prestige is the endgame progression loop.

### Requirements

- Minimum level: **25** (`PRESTIGE_MIN_LEVEL`)
- Triggered from the Pause Menu

### On Prestige

The following state is **reset:**

- Level (back to 1), XP (back to 0)
- Trees planted/harvested/watered/matured counters
- All resources (back to 0), seeds (back to 10 White Oak)
- Grove data (cleared, fresh grid)
- Grid size (back to 12x12)
- Unlocked tools (back to Trowel + Watering Can)

The following state is **preserved:**

- Achievements (never lost)
- Lifetime resource totals (never lost)
- Seasons experienced
- Settings (haptics, sound, rules-seen)

### Prestige Bonuses

Bonuses are tiered, not cumulative. A player at prestige 3 gets tier 3 bonuses, not the sum of 1+2+3.

| Prestige | Growth Speed | XP Multiplier | Max Stamina Bonus | Harvest Yield |
|----------|-------------|---------------|-------------------|---------------|
| 1 | 1.10x | 1.10x | +10 | 1.05x |
| 2 | 1.20x | 1.20x | +20 | 1.10x |
| 3 | 1.35x | 1.30x | +30 | 1.20x |
| 4+ | +0.05x/tier | +0.05x/tier | +5/tier | +0.05x/tier |

### Prestige Species Unlocks

| Prestige Count | Species Unlocked |
|---------------|------------------|
| 1 | Crystalline Oak |
| 2 | Moonwood Ash |
| 3 | Worldtree |

On prestige, unlocked prestige species are added to `unlockedSpecies` alongside the starter White Oak.

### Prestige Cosmetics (Border Themes)

5 decorative border themes that customize the grove frame:

| Prestige | ID | Name | Border Style | Glow |
|----------|----|------|-------------|------|
| 1 | `stone-wall` | Stone Wall | 4px solid `#8B8682` | -- |
| 2 | `flower-hedge` | Flower Hedge | 4px double `#E8A0BF` | -- |
| 3 | `fairy-lights` | Fairy Lights | 3px dashed `#FFD700` | `rgba(255,215,0,0.3)` |
| 4 | `crystal-boundary` | Crystal Boundary | 4px ridge `#A8DADC` | `rgba(168,218,220,0.4)` |
| 5 | `ancient-runes` | Ancient Runes | 5px groove `#7FB285` | `rgba(127,178,133,0.3)` |

The active cosmetic is stored as `activeBorderCosmetic` in the Zustand store. Players can select any unlocked cosmetic from the Pause Menu.

## Source Files

| File | Role |
|------|------|
| `src/game/stores/gameStore.ts` | `xpToNext()`, `levelFromXp()`, `addXp()`, `performPrestige()` |
| `src/game/systems/levelUnlocks.ts` | `LEVEL_UNLOCKS`, `checkNewUnlocks()` |
| `src/game/systems/achievements.ts` | `ACHIEVEMENT_DEFS`, `checkAchievements()` |
| `src/game/systems/prestige.ts` | `calculatePrestigeBonus()`, `PRESTIGE_COSMETICS`, `PRESTIGE_SPECIES` |
| `src/game/ui/AchievementPopup.tsx` | Gold border + sparkle achievement modal |
| `src/game/ui/XPBar.tsx` | XP progress bar in HUD |
| `src/game/ui/PauseMenu.tsx` | Achievement list, grid expansion, prestige trigger |
