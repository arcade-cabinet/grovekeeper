# FIX-W1-F: Survival State — gameStore + db/schema

**Date:** 2026-03-07
**Agent:** Fix Agent (Claude Sonnet 4.6)
**Branch:** feat/expo-migration

---

## Summary

Added survival state fields to `game/stores/gameStore.ts` and DB columns to `game/db/schema.ts`. Added `startNewGame(difficultyId)` action that sets hearts/maxHearts from difficulty config. All 142 gameStore tests pass.

---

## Fields Added to gameStore.ts

Added to `initialState` at lines 274–291 (after `tutorialState`):

| Field | Type | Initial Value | Description |
|---|---|---|---|
| `hunger` | `number` | `100` | Current hunger 0–100; 100=full, 0=starving |
| `maxHunger` | `number` | `100` | Maximum hunger capacity (always 100) |
| `hearts` | `number` | `3` | Current heart count (player health) |
| `maxHearts` | `number` | `3` | Max hearts; overridden by `startNewGame` |
| `bodyTemp` | `number` | `37.0` | Body temperature in °C |
| `lastCampfireId` | `string \| null` | `null` | ID of last rested campfire |
| `lastCampfirePosition` | `{ x, y, z } \| null` | `null` | World position of last rested campfire |

---

## Actions Added to gameStore.ts

Added between the campfire/minimap actions block and `hydrateFromDb` (approximately lines 1268–1330 in the updated file):

| Action | Signature | Description |
|---|---|---|
| `startNewGame` | `(difficultyId: string) => void` | Sets difficulty, hearts/maxHearts from config, resets hunger/bodyTemp/campfire |
| `setHunger` | `(value: number) => void` | Set current hunger |
| `setHearts` | `(value: number) => void` | Set current hearts |
| `setMaxHearts` | `(value: number) => void` | Set max hearts |
| `setBodyTemp` | `(value: number) => void` | Set body temperature |
| `setLastCampfire` | `(id: string \| null, position: { x, y, z } \| null) => void` | Set respawn campfire anchor |

---

## Initial Values per Difficulty Tier

From `config/game/difficulty.json` (IDs renamed by another agent to tree species names):

| Difficulty ID | hunger | maxHunger | hearts | maxHearts |
|---|---|---|---|---|
| `seedling` | 100 | 100 | 7 | 7 |
| `sapling` | 100 | 100 | 5 | 5 |
| `hardwood` | 100 | 100 | 4 | 4 |
| `ironwood` | 100 | 100 | 3 | 3 |
| unknown/fallback | 100 | 100 | 3 | 3 |

---

## DB Columns Added to schema.ts

Added to the `player` table (replacing the `// Forward-compatible: PR 2 exposure system` placeholder comment), lines 34–43:

| Column | Drizzle type | SQLite type | Default |
|---|---|---|---|
| `bodyTemp` | `real` | `REAL` | `37` (pre-existing, comment updated) |
| `hunger` | `real` | `REAL` | `100` |
| `hearts` | `integer` | `INTEGER` | `3` |
| `maxHearts` | `integer` | `INTEGER` | `3` |
| `lastCampfireId` | `text` | `TEXT` | nullable |
| `lastCampfireX` | `real` | `REAL` | nullable |
| `lastCampfireY` | `real` | `REAL` | nullable |
| `lastCampfireZ` | `real` | `REAL` | nullable |

Note: `bodyTemp` already existed (as `body_temp`) — the comment was updated from the forward-compat placeholder to the survival spec reference. No migration was generated; drizzle-kit migration is deferred to US-160 (schema migration sprint).

---

## Where Fields Were Added (Line Numbers, post-edit)

- `initialState` survival block: lines 274–291 of `game/stores/gameStore.ts`
- `difficultyConfig` import: line 63 of `game/stores/gameStore.ts`
- Survival actions block: inserted before `hydrateFromDb` (search for `// Survival actions — Spec §12`)
- Schema columns: lines 34–43 of `game/db/schema.ts`

---

## Test Results

**File:** `game/stores/gameStore.test.ts`

New test suites added:
- `Survival state — initial values (Spec §12)` — 5 tests
- `startNewGame — difficulty-based heart initialization (Spec §12.3)` — 7 tests
- `Survival actions (Spec §12)` — 7 tests

**Total gameStore tests:** 142 passed, 0 failed.

**Full suite:** 3,559 passed / 27 failed. The 27 pre-existing failures are in unrelated suites (`difficulty.test.ts`, `survival.test.ts`, `species.test.ts`, `resources.test.ts`, `speciesDiscovery.test.ts`, `Toast.test.ts`, `PlayerCapsule.test.ts`, `treeScaleSystem.test.ts`) — all were failing before this change. None of these failures were introduced by FIX-W1-F.

---

## Notes

- The `difficulty.json` IDs were already renamed by another concurrent agent (`explore`→`seedling`, `normal`→`sapling`, `hard`→`hardwood`, `brutal`/`ultra-brutal` collapsed into `ironwood`). Tests use the renamed IDs.
- No drizzle migration file was created. The schema defines the target shape; migration generation is ralph's responsibility via US-160.
- `bodyTemp` was a forward-compat placeholder column already in schema; it is now part of the survival state group without duplication.
