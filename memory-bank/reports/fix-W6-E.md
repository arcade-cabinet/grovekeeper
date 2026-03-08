# Fix Report: W6-E — World Naming System (Spec §40)

**Date:** 2026-03-07
**Agent:** W6-E
**Branch:** feat/expo-migration

---

## Summary

Implemented the seeded, deterministic world naming system per spec §40. All names
are generated from fixed word banks using `scopedRNG` — same world seed produces
identical names everywhere across sessions.

---

## Files Created

### `game/utils/worldNames.ts`

Core module implementing two public functions:

- `generateAreaName(type, worldSeed, chunkX, chunkZ): string`
  - `"labyrinth"` → `"The [Adjective][Noun] Labyrinth"` (e.g. `"The Emberveil Labyrinth"`)
  - `"village"` → `"[Prefix][suffix]"` single compound word (e.g. `"Fernwick"`)
  - `"landmark"` → `"The [Adjective] [Type]"` (e.g. `"The Forgotten Tower"`)
- `generateNpcName(worldSeed, npcId): string`
  - Returns a nature-rooted, gender-neutral name (e.g. `"Fern"`, `"Oak the Young"`, `"Reed, Far-Walker"`)
  - 10% probability of a descriptive title
  - Stable for the life of the NPC by keying on `npcId`

Guard: Village names can never return `"Rootmere"` (reserved per §40.1). If the
word bank picks would produce that string, re-rolls once with `chunkX + 1`.

All randomness via `scopedRNG("area-name" | "npc-name", worldSeed, ...)` from
`game/utils/seedWords.ts`.

### `game/utils/worldNames.test.ts`

20 tests covering:
- Pattern matching for all three area types
- Single compound word (no spaces) for village names
- Determinism: same inputs → same output (called twice, asserted equal)
- Variety: different coords produce ≥3 distinct names from 4 samples
- Rootmere guard: exhaustively checked 41×41 grid (1,681 chunks), also tested
  with 4 additional seeds × 11×11 grid — zero "Rootmere" results
- NPC names: first token is always from the spec's first-names list
- NPC determinism: same args → same name
- NPC titles: 200-iteration sweep confirms titles do appear at ~10% rate

---

## Files Modified

### `game/world/mazeGenerator.ts`

- Added `import { generateAreaName } from "@/game/utils/worldNames"`
- Added `name: string` field to `MazeGenerationResult` interface (with JSDoc)
- `generateLabyrinth()` now computes `name = generateAreaName("labyrinth", worldSeed, chunkX, chunkZ)` and includes it in the returned object

---

## Test Results

```
Tests:       20 passed (worldNames)
             26 passed (mazeGenerator — no regressions from wiring)
Total suite: 3912 passed, 6 failed (pre-existing toneLayerFactory failures)
```

The 6 pre-existing failures in `toneLayerFactory.test.ts` are Tone.js mock
lifecycle issues unrelated to this task and were failing before these changes.

---

## TypeScript

`npx tsc --noEmit` produces:
- 278 pre-existing `TS5097` errors (project-wide: `.ts` import extensions, same
  pattern used by every file in the codebase — `allowImportingTsExtensions` not
  enabled in tsconfig)
- 5 pre-existing non-TS5097 errors in other files (DayNightComponent type mismatches)
- **0 new errors introduced by this task**

---

## Spec Coverage

| Spec Section | Status |
|---|---|
| §40.1 — Rootmere is fixed, never generated | Enforced via guard in `generateVillageName` |
| §40.2 — Labyrinth names | Implemented + tested |
| §40.2 — Village names | Implemented + tested |
| §40.2 — Landmark names | Implemented + tested |
| §40.3 — NPC first names (37 names) | Implemented + tested |
| §40.3 — Descriptive titles (10% rate) | Implemented + tested |
| §40.4 — Compass/minimap integration | Out of scope for this agent (UI layer) |

---

## Notes

- The villageGenerator's `NPC_NAMES` inline list is NOT replaced — that's an
  existing hardcoded list used for village NPCs during generation. The new
  `generateNpcName` function provides the spec-compliant approach for procedural
  world NPCs going forward. Callers should migrate to `generateNpcName` when
  wiring NPC dialogue systems.
- No changes were made to `villageGenerator.ts` itself per task scope — the spec
  §40.4 minimap integration is owned by a separate UI agent.
