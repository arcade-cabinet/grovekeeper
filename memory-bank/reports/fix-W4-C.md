# fix-W4-C — US-160/161/162 Decomposition Verification Report

Date: 2026-03-07

---

## 1. gameStore Decomposition (US-160)

### Barrel index.ts

`game/stores/index.ts` correctly barrel-exports all domain actions by assembling:
- `./playerState` (playerStateActions)
- `./progression` (progressionActions)
- `./survivalState` (survivalActions)
- `./inventory` (inventoryActions)
- `./questState` (questStateActions)
- `./settings` (settingsActions)

Also re-exports `./core` and `./chunkDeltas` via `export *`. The `useGameStore` hook,
`getState`, `setState`, `getInitialState`, and `subscribe` are all present.

**STATUS: CORRECT**

### survivalState.ts — survival fields

All required survival fields and functions are present:

| Field/Function | Present |
|----------------|---------|
| `hunger` (via `setHunger`) | YES |
| `hearts` (via `setHearts`) | YES |
| `bodyTemp` (via `setBodyTemp`) | YES |
| `lastCampfireId/Position` (via `setLastCampfire`) | YES |
| `handleDeath()` | YES |

`handleDeath` correctly handles permadeath (ironwood difficulty), resets hunger to 50
and bodyTemp to 37.0 on respawn. `startNewGame` initializes all survival fields.

**STATUS: CORRECT**

### Import migration

- **Old style** (`from "@/game/stores/gameStore"`): **42 files** still using this path.
- **New style** (`from "@/game/stores"`): **2 files** using the short barrel path.

The `index.ts` comment documents this is intentional: "Consumers can import from
`@/game/stores` or `@/game/stores/gameStore`." The old path remains valid because
`gameStore.ts` still exists as a shim (or the path resolves through the barrel).
Import migration was NOT performed — 42 files still use the old path. This is
functional but means the decomposition goal of centralizing imports was not
enforced. **No breakage**, but migration is incomplete.

---

## 2. Wave 2 Fixes Intact (US-161)

### useGameLoop decomposition

`game/hooks/useGameLoop/` is a subpackage with:
- `index.ts`
- `tickGrowth.ts`
- `tickSurvival.ts`
- `tickNpcAI.ts`
- `tickAchievements.ts`

### tickHunger / tickHeartsFromStarvation

PRESENT in `game/hooks/useGameLoop/tickSurvival.ts`:

```
tickSurvival.ts:9:   tickHeartsFromStarvation,
tickSurvival.ts:10:  tickHunger,
tickSurvival.ts:21:  const newHunger = tickHunger(...)
tickSurvival.ts:38:  tickHeartsFromStarvation(healthBridge, newHunger, dt, affectsGameplay);
```

**STATUS: YES — intact**

### ChunkStreamer / chunkManager.update

PRESENT in `game/hooks/useWorldLoader.ts`:

```
useWorldLoader.ts:90: export function ChunkStreamer(): null {
useWorldLoader.ts:98:   _chunkManager.update(playerPos);
```

**STATUS: YES — intact**

### discoverSpirit / useSpiritProximity

PRESENT in `game/hooks/useSpiritProximity.ts`:

```
useSpiritProximity.ts:162: export function useSpiritProximity(): ...
useSpiritProximity.ts:224:   const isNew = store.discoverSpirit(spiritId);
```

**STATUS: YES — intact**

### hashString weather RNG fix

PRESENT in `game/hooks/useGameLoop/index.ts`:

```
index.ts:39:  import { hashString } from "@/game/utils/seedRNG";
index.ts:117: const rngSeed = store.worldSeed ? hashString(store.worldSeed) : Date.now() % 10000;
```

**STATUS: YES — intact**

---

## 3. UI Files Intact (US-162)

| File | Present |
|------|---------|
| `components/player/TouchLookZone.tsx` | YES |
| `components/scene/BirmotherMesh.tsx` | YES |

components/game/ has 70+ files including decomposed subpackages:
- `AchievementPopup/` (subdirectory)
- `GameUI/` (subdirectory)
- `minimap/` (subdirectory)
- `PauseMenu/` (subdirectory)

components/player/ has: FPSCamera, PlayerCapsule, TargetInfo, ToolViewModel, TouchLookZone.
components/scene/ has: BirmotherMesh, Camera, Ground, Lighting, SelectionRing, Sky, TerrainChunk, WaterBody.

**STATUS: ALL PRESENT**

---

## 4. Test Results

```
Tests: 3838 passed, 3838 total
```

**No failures. All 3838 tests pass.**

---

## 5. Files Still Over 300 Lines (non-test files only)

| Lines | File |
|-------|------|
| 950 | `game/utils/treeGeometry.ts` |
| 685 | `game/world/ChunkManager.ts` |
| 628 | `game/ai/PlayerGovernor.ts` |
| 595 | `game/db/queries.ts` |
| 467 | `components/game/SettingsScreen.tsx` |
| 433 | `game/constants/codex.ts` |
| 382 | `game/ai/NpcBrain.ts` |
| 375 | `game/world/entitySpawner.ts` |
| 374 | `components/game/BuildPanel.tsx` |
| 373 | `game/world/pathGenerator.ts` |
| 362 | `components/scene/TerrainChunk.tsx` |
| 355 | `game/systems/AudioManager.ts` |
| 332 | `components/game/NewGameModal.tsx` |
| 331 | `game/actions/actionDispatcher.ts` |
| 328 | `components/game/PlacementGhost.tsx` |
| 318 | `game/world/villageGenerator.ts` |
| 316 | `components/player/ToolViewModel.tsx` |
| 314 | `game/quests/questChainEngine.ts` |
| 304 | `game/systems/enemyAI.ts` |

**15+ non-test files still exceed 300 lines.** US-161/162 did not fully address all
oversized files. The most critical candidates for decomposition in a follow-up:

1. `game/utils/treeGeometry.ts` (950 lines) — largest non-test file; should be split
   into subpackage (e.g. trunk, branches, leaves, lod modules).
2. `game/world/ChunkManager.ts` (685 lines) — core world system; decompose loading,
   unloading, streaming, and persistence into separate modules.
3. `game/ai/PlayerGovernor.ts` (628 lines) — decompose into governor, steering, and
   action modules.
4. `game/db/queries.ts` (595 lines) — split by domain (player, world, npcs, etc.).

---

## 6. Issues Requiring Follow-Up

### ISSUE 1: Import migration incomplete (LOW severity)
42 files still import `from "@/game/stores/gameStore"` instead of `from "@/game/stores"`.
The shim path works but defeats the organizational purpose of the decomposition.
No breakage, but should be cleaned up in a dedicated migration pass.

### ISSUE 2: Multiple non-test files still over 300 lines (MEDIUM severity)
US-161/162 decomposed some systems but 15+ non-test production files remain over
300 lines, including `treeGeometry.ts` at 950 lines. These will trigger the
`file-size-sentinel.sh` hook warnings on future edits. Follow-up US needed.

### ISSUE 3: No issues with Wave 2 fixes — all verified intact.
