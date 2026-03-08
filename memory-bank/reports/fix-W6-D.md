# Fix W6-D: Rootmere Fixed Starting Village

**Agent:** W6-D
**Date:** 2026-03-07
**Spec:** §17.3a — Fixed Starting Village "Rootmere"

---

## Summary

Implemented the fixed starting village "Rootmere" per spec §17.3a. Three fixes were applied:

1. **Terrain heightmap flattening** for chunk (0,0) around village center
2. **Fixed village structure placements** replacing procedural layout for chunk (0,0)
3. **Village name "Rootmere"** propagated into quest and dialogue data

All 3988 tests pass. TypeScript type errors are pre-existing project-wide (290 lines, same baseline before and after changes).

---

## Fix 1: Terrain Heightmap Flattening (terrainGenerator.ts)

**File:** `game/world/terrainGenerator.ts`

Added a post-processing flatten pass applied only to chunk (0,0) after normal fBm generation:

- **Constants exported:** `VILLAGE_CENTER_X = 8`, `VILLAGE_CENTER_Z = 8`, `VILLAGE_FLAT_HEIGHT = 0.3`, `VILLAGE_FLAT_RADIUS = 14`, `VILLAGE_BLEND_TILES = 4`
- Tiles within radius 14 of center (8,8) set to exactly `VILLAGE_FLAT_HEIGHT`
- Tiles in blend zone (radius 14–18) lerp from flat to natural
- The flat radius of 14 covers the entire 16x16 chunk (max distance from center = ~11.31 < 14), so all tiles in chunk (0,0) are flat
- All other chunks: natural terrain unchanged

**Consequence:** Chunk (0,0) produces identical heightmaps for all world seeds (all flat). The existing "different seeds produce different heightmaps" test for chunk (0,0) was updated to use chunk (1,0) instead.

---

## Fix 2: Fixed Village Structure Placements (villageGenerator.ts)

**File:** `game/world/villageGenerator.ts`

Added `ROOTMERE_NAME = "Rootmere"` export and `generateRootmere()` private function. `generateVillage()` now branches at chunk (0,0) to use the fixed layout.

**Fixed Rootmere layout (7 buildings, all relative to center 8,8):**

| Structure | Type ID | Offset | World Pos |
|-----------|---------|--------|-----------|
| Elder Rowan's Hut | `house-1` | (0, 0) | (8, 8) |
| Village Well | `water-well` | (3, 0) | (11, 8) |
| Campfire Ring | `campfire-2` | (-3, 2) | (5, 10) |
| Seed Merchant Stall | `notice-board`* | (2, 3) | (10, 11) |
| Storage Shed | `storage-1` | (-2, -3) | (6, 5) |
| Notice Board | `notice-board` | (0, 3) | (8, 11) |
| Village Gate | `wooden-frame`* | (0, -8) | (8, 0) |

*Note: "Seed Merchant Stall" mapped to `notice-board` (no stall type in structures.json).
*Note: "Village Gate" mapped to `wooden-frame` (no gate type in structures.json).
*Note: "Campfire Ring" mapped to `campfire-2` (Stone Campfire = communal ring).
*Note: Village Gate Z position is clamped from 0 to 1 by `clampToChunk()`.

NPCs remain seeded (personality, name, schedule vary per world seed). NPC `templateId` prefix changed to `rootmere-npc-N` for chunk (0,0).

**Procedural layout preserved** for all non-(0,0) village chunks — no behavior change.

---

## Fix 3: "Rootmere" Name in Data (data-only edits)

**Files modified:**
- `game/quests/data/questChains.json` — `elder-awakening` chain:
  - `ea-talk-to-elder.description`: "the heart of the village" → "the heart of Rootmere"
  - `ea-find-labyrinth.description`: "Leave the village" → "Leave Rootmere"
- `game/npcs/data/dialogues.json`:
  - `tutorial-welcome.text`: "Welcome, young grovekeeper!" → "Welcome to Rootmere, young grovekeeper!"
  - `rowan-tips-general.text`: "lifeblood of our village" → "lifeblood of Rootmere"

---

## Tests Written/Updated

### terrainGenerator.test.ts (+8 tests)
- Village center tile equals `VILLAGE_FLAT_HEIGHT` (new)
- All tiles within flat radius are flat (new)
- All corners of chunk (0,0) are flat (new)
- Blend tiles constant is positive (new)
- Flat region is deterministic across seeds (new)
- Chunk (1,0) is NOT all flat (new)
- Chunk (0,1) is NOT all flat (new)
- Chunk (-1,0) is NOT all flat (new)
- Seed isolation test updated to use chunk (1,0) (modified)
- Added test: chunk (0,0) is identical for any seed (new)

### villageGenerator.test.ts (+12 tests)
- ROOTMERE_NAME export equals "Rootmere"
- Campfire at fixed (8,8) for any seed
- Buildings identical for different seeds
- house-1 at world (8,8)
- water-well at world (11,8)
- storage-1 at world (6,5)
- wooden-frame (gate) position verified
- 7 fixed buildings total
- Valid modelPaths for all buildings
- buildCost = [] for all buildings
- NPC count 2-4 for Rootmere
- NPC templateIds use rootmere-npc prefix

### game/world/ChunkManager.test.ts (1 test updated)
- "different seeds produce different heightmaps" updated to use chunk (1,0)
- Added: "chunk (0,0) is identical for any seed" test

---

## Test Results

```
Test Suites: 165 passed, 165 total
Tests:       3988 passed, 3988 total
```

---

## Files Changed

| File | Change |
|------|--------|
| `game/world/terrainGenerator.ts` | Added flatten pass + 5 exported constants |
| `game/world/villageGenerator.ts` | Added ROOTMERE_NAME, generateRootmere(), branch in generateVillage() |
| `game/world/terrainGenerator.test.ts` | Rewrote with Rootmere flatten tests |
| `game/world/villageGenerator.test.ts` | Rewrote with Rootmere fixed layout tests |
| `game/world/ChunkManager.test.ts` | Fixed seed isolation test for chunk (1,0) |
| `game/quests/data/questChains.json` | 2 "village" → "Rootmere" replacements |
| `game/npcs/data/dialogues.json` | 2 "village" → "Rootmere" replacements |
