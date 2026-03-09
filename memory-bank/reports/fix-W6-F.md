# Fix W6-F: Growing Tree Maze Generator + BFS Pathfinding

**Date:** 2026-03-07
**Spec:** §17.5 — Hedge Labyrinths
**Files owned:**
- `game/systems/hedgePlacement/mazeGen.ts` (algorithm replacement)
- `game/systems/hedgePlacement/index.ts` (barrel export update)
- `game/systems/hedgePlacement/mazeGen.test.ts` (new test file, 14 tests)

---

## What Was Done

### 1. Algorithm Replacement: DFS → Growing Tree (70/30 hybrid)

Replaced the recursive backtracker (pure DFS from corner `grid[0][0]`) with the
Growing Tree algorithm, matching the Beppo-Laughs `maze-generator.service.ts` ratio:

- **70% newest cell** (DFS-like) — creates satisfying long corridors
- **30% random cell** (Prim's-like) — adds junctions and T-intersections

**Start cell changed** from `grid[0][0]` (top-left corner) to `grid[centerX][centerZ]`
(center of the 2×2 spirit room). This makes the spirit room the natural convergence
point of the deepest maze paths rather than the corner.

The `activeCells` list replaces the `stack`. When no unvisited neighbors exist, the
cell is spliced from the active list (`activeCells.splice(pickIdx, 1)`) rather than
popped off a DFS stack.

All existing properties preserved: `removeCenterWalls`, `isCenter` flags, `MazeResult`
return shape, `createRNG(seed)` signature.

### 2. BFS Pathfinding: `findMazePath`

Added pure function exported from `mazeGen.ts` and re-exported from `index.ts`:

```typescript
export function findMazePath(
  maze: MazeResult,
  fromX: number, fromZ: number,
  toX: number, toZ: number,
): { x: number; z: number }[] | null
```

BFS through the maze grid, respecting walls. Returns cell coordinate array from
`from` to `to` (inclusive), or `null` for out-of-bounds inputs. The maze is always
a perfect maze (fully connected), so `null` is only returned for invalid coordinates.

Path reconstruction uses a `parent` Map keyed by `"x,z"` strings.

### 3. Test File: `game/systems/hedgePlacement/mazeGen.test.ts`

14 tests across 5 describe blocks:

| Block | Tests |
|-------|-------|
| Connectivity | 2 — flood-fill from center reaches all cells (two seeds) |
| Center room | 3 — isCenter flag, 2×2 coverage, interior walls removed |
| Determinism | 2 — same seed = identical walls; different seeds = at least one wall differs |
| South entrance | 1 — z=0 edge has reachable cells (entry accessible from outside) |
| findMazePath | 6 — non-null path, start/end cells, wall validity, identity, OOB, cross-grid |

---

## Pre-Existing Issues (Not Fixed by This Task)

1. **`game/world/mazeGenerator.ts`** has an unstaged working-tree change that adds
   `import { generateAreaName } from "@/game/utils/worldNames"` — the file
   `game/utils/worldNames.ts` does not exist. This breaks 19 tests in
   `game/world/mazeGenerator.test.ts`. This change was NOT introduced by this task
   (confirmed via `git stash` which restored all 26 tests to passing). The
   `generateAreaName` import is from a prior concurrent agent session.

2. **TS5097 errors** (`allowImportingTsExtensions`) are pre-existing across 100+
   files in the codebase — the `.ts` extension imports in `mazeGen.test.ts` follow
   the same pattern as all other test files and produce the same class of error.

3. **3 test suites failing** (`toneLayerFactory`, `actionDispatcher`, `useInteraction`)
   are audio/interaction systems entirely unrelated to maze generation.

---

## Test Results

**New tests:** 14/14 passing (`game/systems/hedgePlacement/mazeGen.test.ts`)
**Existing mazeGenerator tests:** 26/26 passing (against clean HEAD without working-tree regression)

```
PASS game/systems/hedgePlacement/mazeGen.test.ts
  generateMaze — connectivity (Spec §17.5)
    ✓ every cell is reachable from the center via flood-fill
    ✓ every cell is reachable for a different seed
  generateMaze — center room (Spec §17.5)
    ✓ grid[centerX][centerZ].isCenter is true
    ✓ all four 2×2 center cells have isCenter=true
    ✓ center 2×2 interior walls are removed
  generateMaze — determinism (Spec §17.5)
    ✓ same seed produces identical wall arrays
    ✓ different seeds produce at least one differing wall
  generateMaze — south entrance (Spec §17.5)
    ✓ south edge (z=0) has at least one cell with open north wall (entrance)
  findMazePath (Spec §17.5)
    ✓ returns a non-null path from (0,0) to center
    ✓ path starts at the from cell and ends at the to cell
    ✓ every step in the path shares an open wall with the next cell
    ✓ returns a single-element path when from === to
    ✓ returns null for out-of-bounds coordinates
    ✓ finds a path between any two reachable cells (cross-grid)
```
