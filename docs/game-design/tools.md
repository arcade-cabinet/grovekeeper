# Tools

The player has access to 8 tools, unlocked progressively as they level up. Tools are the primary means of interacting with the grid and its trees.

## Tool Roster

Defined in `src/game/constants/tools.ts`:

| Tool | ID | Unlock | Stamina | Action | Description |
|------|----|--------|---------|--------|-------------|
| Trowel | `trowel` | Lv 1 | 5 | `PLANT` | Plant a seed on an empty soil tile |
| Watering Can | `watering-can` | Lv 1 | 3 | `WATER` | Water a sprout/sapling for a 1.3x growth boost |
| Almanac | `almanac` | Lv 2 | 0 | `INSPECT` | View tree stats and species info |
| Pruning Shears | `pruning-shears` | Lv 3 | 4 | `PRUNE` | Prune a mature tree for a yield bonus |
| Seed Pouch | `seed-pouch` | Lv 4 | 0 | `SEEDS` | Open the seed inventory |
| Shovel | `shovel` | Lv 5 | 8 | `CLEAR` | Clear blocked tiles or dig irrigation |
| Axe | `axe` | Lv 7 | 10 | `CHOP` | Chop old growth for big timber; clear old trees |
| Compost Bin | `compost-bin` | Lv 10 | 6 | `COMPOST` | Convert waste to fertilizer (2x growth for 1 cycle) |

## Tool Selection Flow

```
ToolBelt (bottom-right HUD, 2x4 grid)
  |
  +-- Tap tool icon --> setSelectedTool(toolId) in gameStore
  |
  +-- OR open ToolWheel dialog for radial selection
  |
  v
Context Action Button shows the active tool's action label
  |
  +-- Tap near a valid tile --> execute tool action
```

Only unlocked tools appear in the ToolBelt. The `unlockedTools` array in the Zustand store tracks which tools the player has earned. New tools are auto-unlocked when the player reaches the required level (handled in `addXp()` via `checkNewUnlocks()`).

## Tool Actions in Detail

### Trowel (PLANT)

1. Player selects Trowel and walks near an empty soil tile.
2. Tap action button to open SeedSelect dialog.
3. Player picks a species from unlocked seeds with available seed count > 0.
4. Spend 1 seed + 5 stamina.
5. Create a tree ECS entity at the tile's grid position (stage 0, progress 0).
6. Build a species-specific mesh from the template cache.
7. Increment `treesPlanted` counter. Track species for the "One of Each" achievement.

### Watering Can (WATER)

1. Target: a tile with a tree at stage 0, 1, or 2 that has `watered === false`.
2. Spend 3 stamina.
3. Set `tree.watered = true` on the ECS entity.
4. Growth system applies a 1.3x multiplier (`WATER_BONUS`) until the tree transitions to the next stage, at which point `watered` resets to `false`.
5. Increment `treesWatered` counter.

### Almanac (INSPECT)

1. Target: any tile with a tree.
2. No stamina cost.
3. Displays species info, current stage name, growth progress percentage, watered status, and time until next stage.

### Pruning Shears (PRUNE)

1. Target: a tree at stage 3 (Mature) or 4 (Old Growth).
2. Spend 4 stamina.
3. Applies a yield bonus multiplier to the next harvest from this tree.

### Seed Pouch (SEEDS)

1. No target required.
2. No stamina cost.
3. Opens the seed inventory overlay showing all owned seeds by species.

### Shovel (CLEAR)

1. Target: a rock tile or other blocked terrain.
2. Spend 8 stamina.
3. Converts the tile to soil, making it plantable.
4. Can also dig irrigation channels near water tiles.

### Axe (CHOP)

1. Target: a tree at stage 3 or 4.
2. Spend 10 stamina.
3. Harvests the tree for its full resource yield.
4. If stage 4 (Old Growth), yields bonus resources (e.g., Redwood grants +1 Acorn).
5. Removes the tree from the grid, freeing the tile.
6. Triggers floating resource particles and haptic feedback.

### Compost Bin (COMPOST)

1. Target: a tile with a tree at any growth stage.
2. Spend 6 stamina.
3. Applies a 2x growth speed multiplier to the tree for one full growth cycle (one stage transition).

## Stamina System

Stamina is the energy currency for tool usage.

| Parameter | Value |
|-----------|-------|
| Starting max | 100 |
| Regen rate | 2 per real second (when idle) |
| Exhaustion | At 0 stamina, all tool actions are blocked |
| Prestige bonus | +10 max stamina per prestige tier (up to +30 at tier 3) |
| Drought penalty | 1.5x stamina cost during drought weather |

Stamina is persisted in the Zustand store for session recovery. The `staminaSystem(dt)` runs every frame and regenerates stamina when no action is being performed.

The `spendStamina(amount)` action in `gameStore` returns `false` if the player does not have enough stamina, preventing the action from executing. Weather modifiers (drought = 1.5x cost) are applied before calling `spendStamina()`.

## Stamina Display

The `StaminaGauge` component in the HUD shows a circular or bar gauge. When stamina drops below 20%, a warning color (red) is applied. Haptic feedback triggers on tool use via `hapticMedium()`.

## Source Files

| File | Role |
|------|------|
| `src/game/constants/tools.ts` | `TOOLS` array, `getToolById()` |
| `src/game/stores/gameStore.ts` | `selectedTool`, `spendStamina()`, `unlockedTools` |
| `src/game/ui/ToolBelt.tsx` | Tool selection HUD (bottom-right) |
| `src/game/ui/SeedSelect.tsx` | Species picker dialog for planting |
| `src/game/systems/stamina.ts` | Per-frame stamina regeneration |
| `src/game/systems/levelUnlocks.ts` | Auto-unlock tools on level-up |
