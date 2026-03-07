# FIX-18: Crafting System Wiring — W2-E Report

## Summary

Six crafting systems (cooking, forging, mining, fishing, traps, kitbashing) that existed as
complete pure-function modules with no callable entry point have been wired to the interaction
handler. The wiring follows the existing CHOP/WATER/PLANT/DIG pattern: player tap sets a
selection, executeAction dispatches via `dispatchAction`, and the system function is called.

---

## Store Fields Added

**File:** `game/stores/gameStore.ts`

New field in `initialState`:
```ts
activeCraftingStation: null as { type: string; entityId: string } | null
```

- Added to `EPHEMERAL_KEYS` — not persisted across sessions (UI state only).
- Types: `"cooking"` | `"forging"` | `"fishing"` | `"kitbash"`.

New action:
```ts
setActiveCraftingStation(station: { type: string; entityId: string } | null)
```

---

## New Action Types Added

**File:** `game/actions/actionDispatcher.ts`

`GameAction` union extended from 5 to 11 verbs:

| Verb | Tool | Target |
|---|---|---|
| `COOK` | any | `campfire` |
| `FORGE` | any | `forge` |
| `MINE` | `pick` | `rock` |
| `FISH` | `fishing-rod` | `water` |
| `PLACE_TRAP` | `trap` | `soil` or `null` |
| `CHECK_TRAP` | any | `trap` |
| `BUILD` | `hammer` | `null` or `soil` |

`TargetEntityType` extended with: `"campfire"`, `"forge"`, `"water"`, `"trap"`.

`DispatchContext` extended with: `waterBodyType`, `biome`, `trapType`.

---

## System Wiring: Trigger -> Dispatch -> System Call

### Cooking (campfire + pot) — Spec §22.1

- **Trigger:** Player taps a grid position where a campfire entity exists. `onGroundTap` calls
  `findCampfireAtGrid()` (iterates `campfiresQuery`) and sets `selection.type = "campfire"`.
- **Dispatch:** `executeAction` falls through to `default:` case, calls
  `dispatchAction({ toolId, targetType: "campfire", entity: campfireEnt })`.
- **System call:** `dispatchAction` calls `resolveCampfireInteraction(entity)` from
  `game/systems/cooking.ts`. If `canCookNow` is true, calls
  `store.setActiveCraftingStation({ type: "cooking", entityId })`. If campfire is unlit, sets
  station to `null` (GameUI can show "Light Campfire" prompt).
- **Re-exports:** `resolveCampfireInteraction` re-exported from dispatcher for TargetInfo/HUD use.

### Forging (forge structure) — Spec §22.2

- **Trigger:** `onGroundTap` calls `findForgeAtGrid()` (iterates `structuresQuery` filtering
  `effectType === "forging"`) and sets `selection.type = "forge"`.
- **Dispatch:** `default:` case wraps the structure entity with `{ forge: { active: struct !== undefined } }`
  to satisfy `ForgeEntity` interface, then calls `dispatchAction({ toolId, targetType: "forge", entity })`.
- **System call:** `dispatchAction` calls `resolveForgeInteraction(entity)` from
  `game/systems/forging.ts`. If `canForgeNow`, calls
  `store.setActiveCraftingStation({ type: "forging", entityId })`.
- **Re-exports:** `resolveForgeInteraction` re-exported from dispatcher.

### Mining (rock/ore entity) — Spec §22

- **Trigger:** Player with `pick` tool taps a tile. `executeAction` `case "pick":` calls
  `findRockAtGrid(gridX, gridZ)` to locate the rock entity.
- **Dispatch:** Calls `dispatchAction({ toolId: "pick", targetType: "rock", entity: rockEntity, biome })`.
- **System call:** `dispatchAction` calls `resolveMiningInteraction(entity)` to get `staminaCost`
  and `rockType`, checks `store.stamina >= staminaCost`, deducts stamina via `store.setStamina`,
  generates yield via `mineRock(rockComponent, biome, rngFn())` using `scopedRNG("mine", worldSeed, entityId)`,
  then credits ore via `store.addResource(oreType, amount)` and `store.incrementToolUse("pick")`.
- **Re-exports:** `resolveMiningInteraction` re-exported from dispatcher.

### Fishing (water entity) — Spec §22

- **Trigger:** `onGroundTap` calls `findWaterAtGrid()` (iterates `waterBodiesQuery`) and sets
  `selection.type = "water"`.
- **Dispatch:** `executeAction` `case "fishing-rod":` resolves the water entity by `entityId`,
  reads `waterEntity.waterBody.waterType`, calls
  `dispatchAction({ toolId: "fishing-rod", targetType: "water", waterBodyType })`.
- **System call:** `dispatchAction` calls `isWaterFishable(waterBodyType)` from
  `game/systems/fishing.ts`. Returns false for `"waterfall"`. On success, calls
  `store.setActiveCraftingStation({ type: "fishing", entityId })` to open the minigame panel.

### Traps — Spec §22

**Placement path:**
- **Trigger:** Player with `trap` tool taps empty ground. `executeAction` `case "trap":` fires.
- **Dispatch:** `dispatchAction({ toolId: "trap", targetType: "soil", gridX, gridZ, trapType })`.
- **System call:** `createTrapComponent(trapType)` from `game/systems/traps.ts` validates the
  trap type (throws on unknown types). Then calls `store.placeTrap?.(trapType, gridX, gridZ)` —
  the optional chaining forwards to the store action when it is implemented (ECS entity creation
  hook, currently a stub point for the game loop phase).

**Collect path:**
- **Trigger:** `onGroundTap` calls `findTrapAtGrid()` (iterates `trapsQuery`) and sets
  `selection.type = "trap"`.
- **Dispatch:** `default:` case calls
  `dispatchAction({ toolId, targetType: "trap", entity: trapEnt })`.
- **System call:** `dispatchAction` calls `store.collectTrap?.(entityId)` — stub point for the
  game loop to handle loot drop and entity removal.

### Kitbashing (build mode) — Spec §35

- **Trigger:** Player with `hammer` tool taps any ground (soil or empty). `executeAction`
  `case "hammer":` fires regardless of selection type.
- **Dispatch:** `dispatchAction({ toolId: "hammer", targetType: "soil" | null })`.
- **System call:** `dispatchAction` calls
  `store.setActiveCraftingStation({ type: "kitbash", entityId: "" })` to open the build panel.
  The `placeModularPiece` commit function from `game/systems/kitbashing/index.ts` is invoked
  from the build panel UI when the player confirms placement (panel → Rapier validation → ECS add).

---

## New Target Detection in useInteraction.ts

New ECS query imports: `campfiresQuery`, `structuresQuery`, `trapsQuery`, `waterBodiesQuery`.

New `SelectionType` values: `"campfire"`, `"forge"`, `"water"`, `"trap"`.

New finder helpers (module-scope pure functions):
- `findCampfireAtGrid(gridX, gridZ)` — iterates `campfiresQuery`
- `findForgeAtGrid(gridX, gridZ)` — iterates `structuresQuery` filtering `effectType === "forging"`
- `findWaterAtGrid(gridX, gridZ)` — iterates `waterBodiesQuery`
- `findTrapAtGrid(gridX, gridZ)` — iterates `trapsQuery`

Detection order in `onGroundTap` (checked before NPC/tile fallthrough):
1. tree
2. campfire
3. forge
4. water
5. trap
6. npc
7. tile (fallthrough)

---

## Test Results

```
PASS game/hooks/useInteraction.test.ts
PASS game/actions/actionDispatcher.test.ts

Tests: 77 passed, 77 total
```

**New tests added to `actionDispatcher.test.ts` (47 new, 30 existing):**

- `resolveAction` crafting verbs: 13 cases covering all 7 new verbs and their null/invalid combos.
- `dispatchAction COOK`: lit campfire opens UI, unlit clears station, missing entity returns false,
  haptic fires on success.
- `dispatchAction FORGE`: active forge opens UI, inactive clears station, missing component returns
  false, haptic fires.
- `dispatchAction MINE`: stamina deducted, ore credited, incrementToolUse called, missing rock
  returns false, haptic fires.
- `dispatchAction FISH`: fishable water opens minigame, waterfall returns false, haptic fires.
- `dispatchAction PLACE_TRAP`: valid type succeeds, unknown type returns false, missing coords/type
  return false, haptic fires.
- `dispatchAction CHECK_TRAP`: entity present returns true, missing entity returns false, haptic fires.
- `dispatchAction BUILD`: null target opens kitbash panel, soil target also works, haptic fires.

---

## Stub Points (not yet implemented, documented for next phase)

- `store.placeTrap(trapType, gridX, gridZ)` — ECS entity spawn for placed traps. Called via
  optional chaining in dispatcher; no-op until the survival systems game loop phase implements it.
- `store.collectTrap(entityId)` — loot drop + entity removal for collected traps. Same.
- GameUI does not yet render `CookingPanel`, `ForgePanel`, `FishingMinigame`, or `KitbashPanel`
  components. `store.activeCraftingStation` is now correctly set; the UI layer reads it to render
  the appropriate panel.
