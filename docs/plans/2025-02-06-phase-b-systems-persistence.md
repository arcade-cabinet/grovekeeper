# Phase B: Systems & Persistence — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the gameplay systems and persistence layer that build on Phase A's data foundation — harvest cooldowns, grid generation, desktop controls, save/load with ECS serialization, and tech debt cleanup.

**Architecture:** Phase A established the data layer (resources, stamina, 5-stage growth, 8 species, 8 tools, seeded RNG, grid math). Phase B connects these to gameplay: trees produce resources on cooldown timers, the grid generates with varied tile types, desktop players get WASD controls, and all ECS state persists across sessions. HUD updates surface the new data. Tech debt is removed to shrink the bundle and simplify the build.

**Tech Stack:** TypeScript, Miniplex ECS, Zustand (persist), BabylonJS, React, Vitest (TDD)

**Depends on:** Phase A must be complete. This plan assumes the following Phase A deliverables exist:
- `src/game/utils/seedRNG.ts` — `createRNG()`, `hashString()`
- `src/game/utils/gridMath.ts` — `gridToWorld()`, `worldToGrid()`, `isInBounds()`, etc.
- `src/game/constants/resources.ts` — `ResourceType`, `emptyResources()`
- `src/game/constants/trees.ts` — `TreeSpeciesData`, `TREE_SPECIES` (8 species), `getSpeciesById()`
- `src/game/constants/tools.ts` — `ToolData`, `TOOLS` (8 tools), `getToolById()`
- `src/game/systems/growth.ts` — 5-stage model with `calcGrowthRate()`, `getStageScale()`
- `src/game/systems/stamina.ts` — `staminaSystem()`, `drainStamina()`
- `src/game/ecs/world.ts` — updated `TreeComponent` with `stage`, `progress`, `watered`, `meshSeed`
- `src/game/stores/gameStore.ts` — `resources`, `seeds`, `addResource()`, `spendResource()`, `addSeed()`, `spendSeed()`

---

## Task 1: Tech Debt Cleanup

Remove legacy code that bloats the bundle and complicates the build. No gameplay impact — purely subtractive. Do this first so subsequent tasks work on a clean codebase.

**Files:**
- Modify: `index.html` — remove ~500 lines of Onlook iframe editor script
- Modify: `vite.config.ts` — remove `styled-jsx/babel` plugin and Next.js path aliases
- Delete: `src/components/next/` — 12 files of Next.js shims
- Delete: `src/next-themes.tsx` — theme provider shim
- Modify: `src/main.tsx` — remove `ThemeProvider` wrapper from `next-themes`
- Modify: `src/components/ui/sonner.tsx` — remove `useTheme` import from `next-themes`

**Step 1: Clean index.html**

Replace `index.html` with a clean version. The current file has the Onlook script (lines 10-770+) injected between `<head>` and `<body>`. Remove the entire `<script>...</script>` block. Also update the `<title>` to "Grovekeeper".

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <title>Grovekeeper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Clean vite.config.ts**

Remove `styled-jsx/babel` from the React plugin's babel config. Remove the `next` and `next-themes` path aliases. Keep only the `@` alias.

```typescript
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  cacheDir: ".vite",
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: Remove Next.js shims**

Delete the entire `src/components/next/` directory (12 files) and `src/next-themes.tsx`.

**Step 4: Update main.tsx**

Remove `ThemeProvider` wrapper. The game uses its own color system, not CSS theme variables.

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 5: Update sonner.tsx**

Remove `useTheme` import. Hardcode theme to "light" since the game is always light-themed.

```typescript
// src/components/ui/sonner.tsx
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
```

**Step 6: Verify build and dev server**

Run: `pnpm dev`
Expected: Dev server starts without errors. Game loads in browser.

Run: `pnpm build`
Expected: Build succeeds. Check output size is smaller than before.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove tech debt (Onlook script, Next.js shims, styled-jsx)"
```

---

## Task 2: Grid Generation System

Replaces the current all-soil grid with the spec's generated grid: 70% empty, 15% blocked (rocks), 10% water (clustered ponds), 5% path. Uses seeded RNG for deterministic generation from a grove seed.

**Files:**
- Create: `src/game/systems/gridGeneration.ts`
- Create: `src/game/systems/gridGeneration.test.ts`
- Modify: `src/game/ecs/archetypes.ts` — update `createGridCellEntity` to accept tile types

**Step 1: Write the failing test**

```typescript
// src/game/systems/gridGeneration.test.ts
import { describe, it, expect } from "vitest";
import { generateGrid, type GridTile } from "./gridGeneration";

describe("Grid Generation", () => {
  it("generates correct number of tiles", () => {
    const grid = generateGrid(12, "test-seed");
    expect(grid).toHaveLength(12 * 12);
  });

  it("is deterministic — same seed produces same grid", () => {
    const grid1 = generateGrid(12, "seed-abc");
    const grid2 = generateGrid(12, "seed-abc");
    expect(grid1).toEqual(grid2);
  });

  it("different seeds produce different grids", () => {
    const grid1 = generateGrid(12, "seed-1");
    const grid2 = generateGrid(12, "seed-2");
    const types1 = grid1.map((t) => t.type).join(",");
    const types2 = grid2.map((t) => t.type).join(",");
    expect(types1).not.toEqual(types2);
  });

  it("respects approximate tile type distribution", () => {
    const grid = generateGrid(12, "distribution-test");
    const total = grid.length;
    const counts = { empty: 0, blocked: 0, water: 0, path: 0 };
    for (const tile of grid) {
      counts[tile.type]++;
    }

    // Allow ±10% tolerance from targets
    expect(counts.empty / total).toBeGreaterThan(0.55);
    expect(counts.empty / total).toBeLessThan(0.85);
    expect(counts.blocked / total).toBeGreaterThan(0.05);
    expect(counts.blocked / total).toBeLessThan(0.25);
    expect(counts.water / total).toBeGreaterThan(0.02);
    expect(counts.water / total).toBeLessThan(0.20);
    expect(counts.path / total).toBeGreaterThan(0.01);
    expect(counts.path / total).toBeLessThan(0.15);
  });

  it("water tiles are clustered (ponds)", () => {
    const grid = generateGrid(12, "cluster-test");
    const waterTiles = grid.filter((t) => t.type === "water");

    if (waterTiles.length < 2) return; // Skip if too few

    // At least one water tile should have an adjacent water tile
    const hasCluster = waterTiles.some((wt) =>
      waterTiles.some(
        (other) =>
          other !== wt &&
          Math.abs(other.col - wt.col) <= 1 &&
          Math.abs(other.row - wt.row) <= 1,
      ),
    );
    expect(hasCluster).toBe(true);
  });

  it("every tile has valid col and row within bounds", () => {
    const size = 12;
    const grid = generateGrid(size, "bounds-test");
    for (const tile of grid) {
      expect(tile.col).toBeGreaterThanOrEqual(0);
      expect(tile.col).toBeLessThan(size);
      expect(tile.row).toBeGreaterThanOrEqual(0);
      expect(tile.row).toBeLessThan(size);
    }
  });

  it("supports different grid sizes", () => {
    const grid16 = generateGrid(16, "size-test");
    expect(grid16).toHaveLength(16 * 16);

    const grid8 = generateGrid(8, "size-test");
    expect(grid8).toHaveLength(8 * 8);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- gridGeneration --run`
Expected: FAIL — module `./gridGeneration` not found

**Step 3: Write the implementation**

```typescript
// src/game/systems/gridGeneration.ts
import { createRNG, hashString } from "../utils/seedRNG";

export type TileType = "empty" | "blocked" | "water" | "path";

export interface GridTile {
  col: number;
  row: number;
  type: TileType;
}

/**
 * Generate a grid with seeded RNG.
 * Distribution targets: 70% empty, 15% blocked, 10% water (clustered), 5% path.
 */
export function generateGrid(size: number, groveSeed: string): GridTile[] {
  const seed = hashString(groveSeed);
  const rng = createRNG(seed);

  const tiles: GridTile[] = [];
  const grid: TileType[][] = Array.from({ length: size }, () =>
    Array(size).fill("empty"),
  );

  // Phase 1: Place water ponds (clustered)
  const numPonds = 1 + Math.floor(rng() * 3); // 1-3 ponds
  for (let p = 0; p < numPonds; p++) {
    const centerCol = Math.floor(rng() * (size - 2)) + 1;
    const centerRow = Math.floor(rng() * (size - 2)) + 1;
    const pondSize = 2 + Math.floor(rng() * 3); // 2-4 tiles per pond

    grid[centerRow][centerCol] = "water";
    let placed = 1;

    // Grow pond from center
    for (let attempt = 0; attempt < pondSize * 3 && placed < pondSize; attempt++) {
      const dir = Math.floor(rng() * 4);
      const offsets = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      const nr = centerRow + offsets[dir][0] + Math.floor(rng() * 2) - 1;
      const nc = centerCol + offsets[dir][1] + Math.floor(rng() * 2) - 1;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === "empty") {
        grid[nr][nc] = "water";
        placed++;
      }
    }
  }

  // Phase 2: Place blocked tiles (rocks) — scattered
  const targetBlocked = Math.floor(size * size * 0.15);
  let blockedPlaced = 0;
  for (let attempt = 0; attempt < targetBlocked * 3 && blockedPlaced < targetBlocked; attempt++) {
    const r = Math.floor(rng() * size);
    const c = Math.floor(rng() * size);
    if (grid[r][c] === "empty") {
      grid[r][c] = "blocked";
      blockedPlaced++;
    }
  }

  // Phase 3: Place path tiles — simple connecting paths
  const targetPath = Math.floor(size * size * 0.05);
  let pathPlaced = 0;

  // Create a path from one edge toward another
  let pathRow = Math.floor(rng() * size);
  let pathCol = 0;
  for (let step = 0; step < size && pathPlaced < targetPath; step++) {
    if (pathCol >= 0 && pathCol < size && pathRow >= 0 && pathRow < size) {
      if (grid[pathRow][pathCol] === "empty") {
        grid[pathRow][pathCol] = "path";
        pathPlaced++;
      }
    }
    // Drift toward center with some randomness
    pathCol++;
    if (rng() < 0.3) {
      pathRow += rng() < 0.5 ? 1 : -1;
      pathRow = Math.max(0, Math.min(size - 1, pathRow));
    }
  }

  // Flatten to tile array
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      tiles.push({ col, row, type: grid[row][col] });
    }
  }

  return tiles;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- gridGeneration --run`
Expected: PASS — all 7 tests pass

**Step 5: Commit**

```bash
git add src/game/systems/gridGeneration.ts src/game/systems/gridGeneration.test.ts
git commit -m "feat: add seeded grid generation (water ponds, rocks, paths)"
```

---

## Task 3: Harvest Cooldown System

Implements the spec's harvest mechanic: trees at stage 3+ (Mature/Old Growth) produce resources on a cooldown timer. When the cooldown completes, the tree is marked harvestable. Player walks to tree and harvests to collect resources.

**Files:**
- Modify: `src/game/ecs/world.ts` — add `harvestable` component to Entity
- Create: `src/game/systems/harvest.ts`
- Create: `src/game/systems/harvest.test.ts`

**Step 1: Add harvestable component to Entity**

In `src/game/ecs/world.ts`, add to the Entity interface:

```typescript
harvestable?: {
  resources: { type: string; amount: number }[];
  cooldownElapsed: number;
  cooldownTotal: number;
  ready: boolean;
};
```

Add query: `export const harvestableQuery = world.with("tree", "harvestable");`

**Step 2: Write the failing test**

```typescript
// src/game/systems/harvest.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  harvestSystem,
  initHarvestable,
  collectHarvest,
} from "./harvest";
import { world } from "../ecs/world";
import { createTreeEntity } from "../ecs/archetypes";

describe("Harvest System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("initHarvestable", () => {
    it("adds harvestable component to mature tree (stage 3)", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);

      initHarvestable(tree);

      expect(tree.harvestable).toBeDefined();
      expect(tree.harvestable!.ready).toBe(false);
      expect(tree.harvestable!.cooldownTotal).toBe(45); // white-oak harvest cycle
      expect(tree.harvestable!.resources.length).toBeGreaterThan(0);
    });

    it("does not add harvestable to immature tree (stage < 3)", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 2;
      world.add(tree);

      initHarvestable(tree);

      expect(tree.harvestable).toBeUndefined();
    });

    it("old growth (stage 4) gets 1.5x yield", () => {
      const matureTree = createTreeEntity(0, 0, "white-oak");
      matureTree.tree!.stage = 3;
      world.add(matureTree);
      initHarvestable(matureTree);

      const oldTree = createTreeEntity(1, 0, "white-oak");
      oldTree.tree!.stage = 4;
      world.add(oldTree);
      initHarvestable(oldTree);

      const matureAmount = matureTree.harvestable!.resources[0].amount;
      const oldAmount = oldTree.harvestable!.resources[0].amount;
      expect(oldAmount).toBeGreaterThan(matureAmount);
    });
  });

  describe("harvestSystem", () => {
    it("advances cooldown elapsed time", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);

      harvestSystem(10);

      expect(tree.harvestable!.cooldownElapsed).toBe(10);
    });

    it("marks tree ready when cooldown completes", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);

      harvestSystem(50); // > 45 sec cooldown for white-oak

      expect(tree.harvestable!.ready).toBe(true);
    });

    it("does not advance past ready", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      harvestSystem(100);

      expect(tree.harvestable!.ready).toBe(true);
    });
  });

  describe("collectHarvest", () => {
    it("returns resources and resets cooldown", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      const result = collectHarvest(tree);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      expect(tree.harvestable!.ready).toBe(false);
      expect(tree.harvestable!.cooldownElapsed).toBe(0);
    });

    it("returns null if not ready", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);

      const result = collectHarvest(tree);

      expect(result).toBeNull();
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm test -- harvest --run`
Expected: FAIL — module `./harvest` not found

**Step 4: Write the implementation**

```typescript
// src/game/systems/harvest.ts
import { getSpeciesById } from "../constants/trees";
import type { Entity } from "../ecs/world";
import { harvestableQuery } from "../ecs/world";

/**
 * Initialize the harvestable component on a tree entity.
 * Only applies to Mature (stage 3) and Old Growth (stage 4) trees.
 * Old Growth gets 1.5x yield.
 */
export function initHarvestable(entity: Entity): void {
  if (!entity.tree || entity.tree.stage < 3) return;

  const species = getSpeciesById(entity.tree.speciesId);
  if (!species) return;

  const yieldMultiplier = entity.tree.stage >= 4 ? 1.5 : 1.0;

  entity.harvestable = {
    resources: species.yield.map((y) => ({
      type: y.resource,
      amount: Math.floor(y.amount * yieldMultiplier),
    })),
    cooldownElapsed: 0,
    cooldownTotal: species.harvestCycleSec,
    ready: false,
  };
}

/**
 * Advances harvest cooldown timers for all harvestable trees.
 * Marks `ready = true` when cooldown completes.
 */
export function harvestSystem(deltaTime: number): void {
  for (const entity of harvestableQuery) {
    if (!entity.harvestable || entity.harvestable.ready) continue;

    entity.harvestable.cooldownElapsed += deltaTime;

    if (entity.harvestable.cooldownElapsed >= entity.harvestable.cooldownTotal) {
      entity.harvestable.ready = true;
    }
  }
}

/**
 * Collect harvest from a tree.
 * Returns the resources if ready, resets cooldown.
 * Returns null if not ready.
 */
export function collectHarvest(
  entity: Entity,
): { type: string; amount: number }[] | null {
  if (!entity.harvestable || !entity.harvestable.ready) return null;

  const resources = [...entity.harvestable.resources];
  entity.harvestable.ready = false;
  entity.harvestable.cooldownElapsed = 0;

  return resources;
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm test -- harvest --run`
Expected: PASS — all 8 tests pass

**Step 6: Commit**

```bash
git add src/game/ecs/world.ts src/game/systems/harvest.ts src/game/systems/harvest.test.ts
git commit -m "feat: add harvest cooldown system (mature/old growth resource production)"
```

---

## Task 4: Desktop Keyboard Controls (WASD)

Adds keyboard input for desktop players. The spec requires WASD + arrow keys for isometric movement, number keys 1-8 for tool selection, E for seed selector, Space/Enter for action, Escape/P for pause.

**Files:**
- Create: `src/game/hooks/useKeyboardInput.ts`
- Create: `src/game/hooks/useKeyboardInput.test.ts`
- Modify: `src/game/scenes/GameScene.tsx` — wire keyboard input into movement + actions

**Step 1: Write the failing test**

```typescript
// src/game/hooks/useKeyboardInput.test.ts
import { describe, it, expect } from "vitest";
import { keysToIsometric } from "./useKeyboardInput";

describe("useKeyboardInput", () => {
  describe("keysToIsometric", () => {
    it("returns zero movement when no keys pressed", () => {
      const result = keysToIsometric(new Set());
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });

    it("converts W to iso NW direction", () => {
      const result = keysToIsometric(new Set(["w"]));
      expect(result.x).toBeLessThan(0); // left on screen = -x iso
      expect(result.z).toBeLessThan(0); // up on screen = -z iso
    });

    it("converts D to iso NE direction", () => {
      const result = keysToIsometric(new Set(["d"]));
      expect(result.x).toBeGreaterThan(0);
      expect(result.z).toBeLessThan(0);
    });

    it("normalizes diagonal movement to magnitude <= 1", () => {
      const result = keysToIsometric(new Set(["w", "d"]));
      const mag = Math.sqrt(result.x * result.x + result.z * result.z);
      expect(mag).toBeLessThanOrEqual(1.01); // small float tolerance
    });

    it("arrow keys work the same as WASD", () => {
      const wasd = keysToIsometric(new Set(["w"]));
      const arrow = keysToIsometric(new Set(["arrowup"]));
      expect(wasd.x).toBeCloseTo(arrow.x);
      expect(wasd.z).toBeCloseTo(arrow.z);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- useKeyboardInput --run`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// src/game/hooks/useKeyboardInput.ts
import { useCallback, useEffect, useRef } from "react";

/**
 * Convert a set of pressed keys to isometric world movement vector.
 *
 * Spec §13 WASD -> Isometric:
 *   inputX = (D ? 1 : 0) - (A ? 1 : 0)
 *   inputY = (W ? 1 : 0) - (S ? 1 : 0)
 *   worldX = inputX - inputY
 *   worldZ = inputX + inputY
 *   Normalize if magnitude > 1
 */
export function keysToIsometric(keys: Set<string>): { x: number; z: number } {
  const inputX =
    (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
    (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const inputY =
    (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
    (keys.has("s") || keys.has("arrowdown") ? 1 : 0);

  if (inputX === 0 && inputY === 0) return { x: 0, z: 0 };

  let worldX = inputX - inputY;
  let worldZ = -(inputX + inputY);

  // Normalize if diagonal
  const mag = Math.sqrt(worldX * worldX + worldZ * worldZ);
  if (mag > 1) {
    worldX /= mag;
    worldZ /= mag;
  }

  return { x: worldX, z: worldZ };
}

interface KeyboardInputCallbacks {
  onMove: (x: number, z: number) => void;
  onMoveEnd: () => void;
  onAction: () => void;
  onOpenSeeds: () => void;
  onPause: () => void;
  onSelectTool: (index: number) => void;
}

/**
 * Hook that captures WASD/arrow keys + action keys.
 * Returns nothing — calls callbacks directly.
 */
export function useKeyboardInput(callbacks: KeyboardInputCallbacks): void {
  const keysDown = useRef(new Set<string>());
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const updateMovement = useCallback(() => {
    const iso = keysToIsometric(keysDown.current);
    if (iso.x === 0 && iso.z === 0) {
      callbacksRef.current.onMoveEnd();
    } else {
      callbacksRef.current.onMove(iso.x, iso.z);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Movement keys
      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
      ) {
        e.preventDefault();
        keysDown.current.add(key);
        updateMovement();
        return;
      }

      // Action: Space or Enter
      if (key === " " || key === "enter") {
        e.preventDefault();
        callbacksRef.current.onAction();
        return;
      }

      // Seed selector: E
      if (key === "e") {
        e.preventDefault();
        callbacksRef.current.onOpenSeeds();
        return;
      }

      // Pause: Escape or P
      if (key === "escape" || key === "p") {
        e.preventDefault();
        callbacksRef.current.onPause();
        return;
      }

      // Tool selection: 1-8
      const num = parseInt(key);
      if (num >= 1 && num <= 8) {
        e.preventDefault();
        callbacksRef.current.onSelectTool(num - 1);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDown.current.delete(key);
      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
      ) {
        updateMovement();
      }
    };

    // Clear keys on focus loss
    const handleBlur = () => {
      keysDown.current.clear();
      callbacksRef.current.onMoveEnd();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [updateMovement]);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- useKeyboardInput --run`
Expected: PASS — all 5 tests pass

**Step 5: Commit**

```bash
git add src/game/hooks/useKeyboardInput.ts src/game/hooks/useKeyboardInput.test.ts
git commit -m "feat: add desktop keyboard controls (WASD, arrows, tool keys, action)"
```

---

## Task 5: Save/Load System with ECS Serialization

The critical persistence bug: trees are currently lost on page refresh because ECS entities aren't serialized. This task adds a save/load system that serializes all ECS tree entities alongside the Zustand store.

**Files:**
- Create: `src/game/systems/saveLoad.ts`
- Create: `src/game/systems/saveLoad.test.ts`
- Modify: `src/game/stores/gameStore.ts` — add `groveSeed` and `hasSaveData` fields

**Step 1: Write the failing test**

```typescript
// src/game/systems/saveLoad.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { serializeGrove, deserializeGrove, type GroveSaveData } from "./saveLoad";
import { world, treesQuery, gridCellsQuery } from "../ecs/world";
import { createTreeEntity, createGridCellEntity } from "../ecs/archetypes";

describe("Save/Load System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("serializeGrove", () => {
    it("serializes tree entities", () => {
      const tree = createTreeEntity(3, 5, "white-oak");
      tree.tree!.stage = 2;
      tree.tree!.progress = 0.6;
      tree.tree!.watered = true;
      tree.tree!.totalGrowthTime = 120;
      world.add(tree);

      const data = serializeGrove(12, "test-seed");

      expect(data.trees).toHaveLength(1);
      expect(data.trees[0].col).toBe(3);
      expect(data.trees[0].row).toBe(5);
      expect(data.trees[0].speciesId).toBe("white-oak");
      expect(data.trees[0].stage).toBe(2);
      expect(data.trees[0].progress).toBeCloseTo(0.6);
      expect(data.trees[0].watered).toBe(true);
    });

    it("serializes grid tiles", () => {
      world.add(createGridCellEntity(0, 0, "soil"));
      world.add(createGridCellEntity(1, 0, "water"));

      const data = serializeGrove(12, "test-seed");

      expect(data.tiles.length).toBeGreaterThanOrEqual(2);
    });

    it("includes grid metadata", () => {
      const data = serializeGrove(12, "my-seed");
      expect(data.gridSize).toBe(12);
      expect(data.seed).toBe("my-seed");
    });
  });

  describe("deserializeGrove", () => {
    it("recreates tree entities from save data", () => {
      const saveData: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 12,
        seed: "test",
        tiles: [{ col: 3, row: 5, type: "soil" }],
        trees: [
          {
            col: 3,
            row: 5,
            speciesId: "white-oak",
            meshSeed: 12345,
            stage: 3,
            progress: 0.4,
            watered: false,
            totalGrowthTime: 200,
          },
        ],
      };

      deserializeGrove(saveData);

      const trees = [...treesQuery];
      expect(trees).toHaveLength(1);
      expect(trees[0].tree!.speciesId).toBe("white-oak");
      expect(trees[0].tree!.stage).toBe(3);
      expect(trees[0].tree!.progress).toBeCloseTo(0.4);
      expect(trees[0].position!.x).toBe(3);
      expect(trees[0].position!.z).toBe(5);
    });

    it("recreates grid cell entities from save data", () => {
      const saveData: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 12,
        seed: "test",
        tiles: [
          { col: 0, row: 0, type: "soil" },
          { col: 1, row: 0, type: "water" },
        ],
        trees: [],
      };

      deserializeGrove(saveData);

      const cells = [...gridCellsQuery];
      expect(cells).toHaveLength(2);
    });

    it("clears existing entities before loading", () => {
      world.add(createTreeEntity(0, 0, "white-oak"));
      world.add(createTreeEntity(1, 1, "white-oak"));

      const saveData: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 12,
        seed: "test",
        tiles: [],
        trees: [
          {
            col: 5,
            row: 5,
            speciesId: "elder-pine",
            meshSeed: 99,
            stage: 1,
            progress: 0.2,
            watered: false,
            totalGrowthTime: 30,
          },
        ],
      };

      deserializeGrove(saveData);

      const trees = [...treesQuery];
      expect(trees).toHaveLength(1);
      expect(trees[0].tree!.speciesId).toBe("elder-pine");
    });

    it("round-trips correctly (serialize → deserialize)", () => {
      const tree = createTreeEntity(7, 9, "cherry-blossom");
      tree.tree!.stage = 3;
      tree.tree!.progress = 0.75;
      tree.tree!.watered = true;
      tree.tree!.totalGrowthTime = 300;
      world.add(tree);

      world.add(createGridCellEntity(7, 9, "soil"));

      const saved = serializeGrove(12, "round-trip");

      // Clear and reload
      for (const entity of [...world]) {
        world.remove(entity);
      }

      deserializeGrove(saved);

      const trees = [...treesQuery];
      expect(trees).toHaveLength(1);
      expect(trees[0].tree!.speciesId).toBe("cherry-blossom");
      expect(trees[0].tree!.stage).toBe(3);
      expect(trees[0].tree!.progress).toBeCloseTo(0.75);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- saveLoad --run`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// src/game/systems/saveLoad.ts
import { createGridCellEntity, createTreeEntity } from "../ecs/archetypes";
import { gridCellsQuery, treesQuery, world } from "../ecs/world";

export interface TreeSave {
  col: number;
  row: number;
  speciesId: string;
  meshSeed: number;
  stage: number;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
}

export interface TileSave {
  col: number;
  row: number;
  type: string;
}

export interface GroveSaveData {
  version: number;
  timestamp: number;
  gridSize: number;
  seed: string;
  tiles: TileSave[];
  trees: TreeSave[];
}

const SAVE_KEY = "grovekeeper-grove";

/**
 * Serialize all ECS tree and grid entities into a saveable object.
 */
export function serializeGrove(gridSize: number, groveSeed: string): GroveSaveData {
  const trees: TreeSave[] = [];
  for (const entity of treesQuery) {
    if (!entity.tree || !entity.position) continue;
    trees.push({
      col: Math.round(entity.position.x),
      row: Math.round(entity.position.z),
      speciesId: entity.tree.speciesId,
      meshSeed: entity.tree.meshSeed,
      stage: entity.tree.stage,
      progress: entity.tree.progress,
      watered: entity.tree.watered,
      totalGrowthTime: entity.tree.totalGrowthTime,
    });
  }

  const tiles: TileSave[] = [];
  for (const entity of gridCellsQuery) {
    if (!entity.gridCell) continue;
    tiles.push({
      col: entity.gridCell.gridX,
      row: entity.gridCell.gridZ,
      type: entity.gridCell.type,
    });
  }

  return {
    version: 1,
    timestamp: Date.now(),
    gridSize,
    seed: groveSeed,
    tiles,
    trees,
  };
}

/**
 * Clear the ECS world and recreate entities from save data.
 */
export function deserializeGrove(data: GroveSaveData): void {
  // Clear all existing entities
  for (const entity of [...world]) {
    world.remove(entity);
  }

  // Recreate grid cells
  for (const tile of data.tiles) {
    world.add(
      createGridCellEntity(
        tile.col,
        tile.row,
        tile.type as "soil" | "water" | "rock" | "path",
      ),
    );
  }

  // Build a map for marking cells as occupied
  const cellMap = new Map<string, ReturnType<typeof createGridCellEntity>>();
  for (const entity of gridCellsQuery) {
    if (entity.gridCell) {
      cellMap.set(`${entity.gridCell.gridX},${entity.gridCell.gridZ}`, entity);
    }
  }

  // Recreate trees
  for (const treeSave of data.trees) {
    const tree = createTreeEntity(treeSave.col, treeSave.row, treeSave.speciesId);
    tree.tree!.stage = treeSave.stage as 0 | 1 | 2 | 3 | 4;
    tree.tree!.progress = treeSave.progress;
    tree.tree!.watered = treeSave.watered;
    tree.tree!.totalGrowthTime = treeSave.totalGrowthTime;
    tree.tree!.meshSeed = treeSave.meshSeed;
    world.add(tree);

    // Mark cell as occupied
    const cell = cellMap.get(`${treeSave.col},${treeSave.row}`);
    if (cell?.gridCell) {
      cell.gridCell.occupied = true;
      cell.gridCell.treeEntityId = tree.id;
    }
  }
}

/**
 * Save grove data to localStorage.
 */
export function saveGroveToStorage(gridSize: number, groveSeed: string): void {
  const data = serializeGrove(gridSize, groveSeed);
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

/**
 * Load grove data from localStorage. Returns null if no save exists.
 */
export function loadGroveFromStorage(): GroveSaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GroveSaveData;
  } catch {
    return null;
  }
}

/**
 * Check if save data exists in localStorage.
 */
export function hasSaveData(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/**
 * Clear save data from localStorage.
 */
export function clearSaveData(): void {
  localStorage.removeItem(SAVE_KEY);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- saveLoad --run`
Expected: PASS — all 7 tests pass

**Step 5: Add groveSeed to gameStore**

Add `groveSeed: string` to the Zustand gameStore state (persisted). Default value: generated random string on new game. Add action `setGroveSeed(seed: string)`.

**Step 6: Commit**

```bash
git add src/game/systems/saveLoad.ts src/game/systems/saveLoad.test.ts src/game/stores/gameStore.ts
git commit -m "feat: add save/load system with ECS entity serialization"
```

---

## Task 6: HUD — Resource Bar Component

Surfaces the Phase A resource economy in the HUD. Replaces the coins-only display with a 2x2 resource grid showing Timber, Sap, Fruit, Acorns.

**Files:**
- Create: `src/game/ui/ResourceBar.tsx`
- Modify: `src/game/ui/HUD.tsx` — integrate ResourceBar

**Step 1: Create ResourceBar component**

```typescript
// src/game/ui/ResourceBar.tsx
import { RESOURCE_INFO, type ResourceType } from "../constants/resources";
import { useGameStore } from "../stores/gameStore";

const RESOURCE_EMOJIS: Record<ResourceType, string> = {
  timber: "🪵",
  sap: "🫧",
  fruit: "🍎",
  acorns: "🌰",
};

export const ResourceBar = () => {
  const resources = useGameStore((s) => s.resources);

  return (
    <div
      className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2 py-1 rounded-xl text-xs font-bold"
      style={{
        background: "rgba(245, 240, 227, 0.90)",
        border: "2px solid #5D4037",
        boxShadow: "0 4px 12px rgba(26, 58, 42, 0.15)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {(["timber", "sap", "fruit", "acorns"] as ResourceType[]).map((type) => (
        <div key={type} className="flex items-center gap-1">
          <span>{RESOURCE_EMOJIS[type]}</span>
          <span style={{ color: "#3E2723" }}>{resources[type]}</span>
        </div>
      ))}
    </div>
  );
};
```

**Step 2: Integrate into HUD**

In `src/game/ui/HUD.tsx`, import `ResourceBar` and add it to the left stats area, replacing or supplementing the coins display.

```typescript
// In HUD.tsx, replace the coins display with:
<ResourceBar />
```

Keep the coins display only if you want backward compatibility during the transition. The spec removes coins entirely in favor of the four resources.

**Step 3: Verify visually**

Run: `pnpm dev`
Check: Resource bar shows four resource types with counts in the top HUD area.

**Step 4: Commit**

```bash
git add src/game/ui/ResourceBar.tsx src/game/ui/HUD.tsx
git commit -m "feat: add resource bar HUD component (Timber/Sap/Fruit/Acorns)"
```

---

## Task 7: HUD — Stamina Gauge Component

Displays the farmer's stamina as a vertical bar on the right side. Color gradient: green (full) → yellow (50%) → red (25%). Pulse animation below 25%.

**Files:**
- Create: `src/game/ui/StaminaGauge.tsx`
- Modify: `src/game/ui/GameUI.tsx` — add StaminaGauge to the game overlay

**Step 1: Create StaminaGauge component**

```typescript
// src/game/ui/StaminaGauge.tsx
import { useGameStore } from "../stores/gameStore";

export const StaminaGauge = () => {
  const stamina = useGameStore((s) => s.stamina ?? 100);
  const maxStamina = useGameStore((s) => s.maxStamina ?? 100);

  const pct = Math.round((stamina / maxStamina) * 100);

  // Color gradient: green > 50%, yellow 25-50%, red < 25%
  let fillColor = "#4CAF50"; // green
  if (pct < 25) {
    fillColor = "#F44336"; // red
  } else if (pct < 50) {
    fillColor = "#FFC107"; // yellow/amber
  }

  const isLow = pct < 25;

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{
        width: 28,
      }}
    >
      {/* Vertical bar container */}
      <div
        className="relative w-full rounded-lg overflow-hidden"
        style={{
          height: 100,
          background: "rgba(245, 240, 227, 0.90)",
          border: "2px solid #5D4037",
          boxShadow: "0 4px 12px rgba(26, 58, 42, 0.15)",
        }}
      >
        {/* Fill — grows from bottom */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${isLow ? "animate-pulse" : ""}`}
          style={{
            height: `${pct}%`,
            background: fillColor,
            borderRadius: "0 0 6px 6px",
          }}
        />
      </div>

      {/* Label */}
      <span
        className="text-[10px] font-bold"
        style={{
          color: "rgba(245, 240, 227, 0.9)",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {Math.round(stamina)}
      </span>
    </div>
  );
};
```

**Step 2: Add to GameUI**

In `src/game/ui/GameUI.tsx`, add the `StaminaGauge` positioned at `bottom: 180px; right: 16px` per the spec's HUD layout.

```typescript
// In GameUI.tsx, add inside the overlay div:
<div className="absolute pointer-events-none" style={{ bottom: 180, right: 16 }}>
  <StaminaGauge />
</div>
```

**Step 3: Verify visually**

Run: `pnpm dev`
Check: Vertical stamina bar appears on the right side. It should be green at full, and turn red when low.

**Step 4: Commit**

```bash
git add src/game/ui/StaminaGauge.tsx src/game/ui/GameUI.tsx
git commit -m "feat: add stamina gauge HUD component (vertical bar with color gradient)"
```

---

## Task 8: HUD — Tool Belt Component

Replaces the current dialog-based tool selector with the spec's always-visible 2x4 tool belt grid. Active tool gets a highlight ring. Locked tools are grayed out. Shows active seed count when trowel is selected.

**Files:**
- Create: `src/game/ui/ToolBelt.tsx`
- Modify: `src/game/ui/GameUI.tsx` — replace ToolWheel with ToolBelt in bottom-right

**Step 1: Create ToolBelt component**

```typescript
// src/game/ui/ToolBelt.tsx
import { TOOLS, type ToolData } from "../constants/tools";
import { useGameStore } from "../stores/gameStore";

const TOOL_EMOJIS: Record<string, string> = {
  trowel: "🔨",
  "watering-can": "🪣",
  almanac: "📖",
  "pruning-shears": "✂️",
  "seed-pouch": "🌱",
  shovel: "⛏️",
  axe: "🪓",
  "compost-bin": "♻️",
};

interface ToolBeltProps {
  onSelectTool: (toolId: string) => void;
}

export const ToolBelt = ({ onSelectTool }: ToolBeltProps) => {
  const selectedTool = useGameStore((s) => s.selectedTool);
  const unlockedTools = useGameStore((s) => s.unlockedTools);
  const level = useGameStore((s) => s.level);
  const seeds = useGameStore((s) => s.seeds);
  const selectedSpecies = useGameStore((s) => s.selectedSpecies);

  return (
    <div
      className="flex flex-col gap-1 p-1.5 rounded-xl"
      style={{
        background: "rgba(245, 240, 227, 0.90)",
        border: "2px solid #5D4037",
        boxShadow: "0 4px 12px rgba(26, 58, 42, 0.15)",
      }}
    >
      {/* 2x4 grid of tools */}
      <div className="grid grid-cols-4 gap-1">
        {TOOLS.map((tool) => {
          const isUnlocked = unlockedTools.includes(tool.id);
          const isActive = selectedTool === tool.id;
          const canUnlock = level >= tool.unlockLevel;

          return (
            <button
              key={tool.id}
              className="flex items-center justify-center rounded-lg transition-transform active:scale-95 touch-manipulation"
              style={{
                width: 44,
                height: 44,
                fontSize: "1.25rem",
                background: isActive
                  ? "rgba(255, 193, 7, 0.3)"
                  : "rgba(255, 255, 255, 0.5)",
                border: isActive
                  ? "2px solid #FFC107"
                  : "2px solid transparent",
                opacity: isUnlocked ? 1 : canUnlock ? 0.6 : 0.3,
                transform: isActive ? "scale(1.08)" : "scale(1)",
                filter: isUnlocked ? "none" : "grayscale(100%)",
              }}
              onClick={() => isUnlocked && onSelectTool(tool.id)}
              disabled={!isUnlocked}
              title={`${tool.name}${!isUnlocked ? ` (Lv.${tool.unlockLevel})` : ""}`}
            >
              {TOOL_EMOJIS[tool.id] ?? "🔧"}
            </button>
          );
        })}
      </div>

      {/* Active seed display when trowel selected */}
      {selectedTool === "trowel" && (
        <div
          className="text-[10px] font-bold text-center px-1 py-0.5 rounded"
          style={{
            background: "rgba(74, 124, 89, 0.2)",
            color: "#3E2723",
          }}
        >
          🌱 {selectedSpecies} (×{seeds[selectedSpecies] ?? 0})
        </div>
      )}
    </div>
  );
};
```

**Step 2: Wire into GameUI**

In `src/game/ui/GameUI.tsx`:
1. Import `ToolBelt`
2. Replace or supplement the existing ToolWheel with the always-visible ToolBelt at `bottom: 24px; right: 16px`
3. Keep ToolWheel as a fallback for detailed tool info/unlocking if desired

```typescript
// In GameUI.tsx, add in the bottom-right area:
<div className="absolute pointer-events-auto" style={{ bottom: 24, right: 16 }}>
  <ToolBelt onSelectTool={(id) => useGameStore.getState().setSelectedTool(id)} />
</div>
```

**Step 3: Verify visually**

Run: `pnpm dev`
Check: Tool belt appears bottom-right with 2x4 grid. Tapping a tool highlights it. Locked tools are grayed. Trowel shows seed count.

**Step 4: Commit**

```bash
git add src/game/ui/ToolBelt.tsx src/game/ui/GameUI.tsx
git commit -m "feat: add tool belt HUD component (2x4 grid, active highlight, seed display)"
```

---

## Task 9: Integration — Wire Everything Together

Connects all Phase B systems into the game loop and scene. Ensures grid generation runs on new game, harvest system runs in the loop, keyboard input is active, and saves trigger on the right events.

**Files:**
- Modify: `src/game/scenes/GameScene.tsx` — comprehensive wiring
- Modify: `src/game/ui/GameUI.tsx` — wire keyboard input callbacks

**Step 1: Wire grid generation into new game flow**

In `GameScene.tsx`, when initializing a new game (the ECS setup in the first `useEffect`):

```typescript
// Replace the all-soil grid initialization with:
import { generateGrid } from "../systems/gridGeneration";

// If no save data exists, generate a new grid:
const groveSeed = useGameStore.getState().groveSeed || `grove-${Date.now()}`;
const tiles = generateGrid(GRID_SIZE, groveSeed);
for (const tile of tiles) {
  world.add(createGridCellEntity(tile.col, tile.row, tile.type as "soil" | "water" | "rock" | "path"));
}
```

**Step 2: Wire harvest system into game loop**

In the `engine.runRenderLoop` callback, add after `growthSystem`:

```typescript
import { harvestSystem } from "../systems/harvest";
import { staminaSystem } from "../systems/stamina";

// In render loop:
harvestSystem(deltaTime);
staminaSystem(deltaTime);
```

**Step 3: Wire save system**

Add auto-save triggers:
1. Every 30 seconds during gameplay
2. On `visibilitychange` (tab switch / app background)
3. On pause menu open

```typescript
import { saveGroveToStorage, loadGroveFromStorage, deserializeGrove } from "../systems/saveLoad";

// In render loop, add periodic save (every 30 seconds):
if (Math.floor(now / 30000) !== Math.floor((now - deltaMs) / 30000)) {
  saveGroveToStorage(GRID_SIZE, groveSeed);
}

// Add visibilitychange listener in useEffect:
const handleVisibility = () => {
  if (document.hidden) {
    saveGroveToStorage(GRID_SIZE, groveSeed);
  }
};
document.addEventListener("visibilitychange", handleVisibility);
```

On Continue (existing save):
```typescript
const saved = loadGroveFromStorage();
if (saved) {
  deserializeGrove(saved);
  // Also add back the player entity
  world.add(createPlayerEntity());
}
```

**Step 4: Wire keyboard input**

In `GameScene.tsx`, import and call `useKeyboardInput`:

```typescript
import { useKeyboardInput } from "../hooks/useKeyboardInput";

// In the component body:
useKeyboardInput({
  onMove: handleMove,
  onMoveEnd: handleMoveEnd,
  onAction: handleAction,
  onOpenSeeds: () => setSeedSelectOpen(true),
  onPause: () => setPauseMenuOpen((prev) => !prev),
  onSelectTool: (index) => {
    const tool = TOOLS[index];
    if (tool && unlockedTools.includes(tool.id)) {
      setSelectedTool(tool.id);
    }
  },
});
```

**Step 5: Wire harvest action into handleAction**

Update the action handler to support harvest when a tree is ready:

```typescript
// When the active tool can harvest and tree.harvestable.ready:
import { collectHarvest, initHarvestable } from "../systems/harvest";

// In handleAction, add a harvest case:
// If tree is harvestable and ready, collect resources
if (tree.harvestable?.ready) {
  const resources = collectHarvest(tree);
  if (resources) {
    for (const r of resources) {
      addResource(r.type as ResourceType, r.amount);
    }
    addXp(8);
  }
}
```

Also: when a tree reaches Mature (stage 3) during growth, initialize its harvestable component. This can be checked in the growth system or as a post-growth hook.

**Step 6: Run full test suite**

Run: `pnpm test --run`
Expected: ALL tests pass

**Step 7: Run dev server and verify**

Run: `pnpm dev`
Manual checks:
- New game generates varied grid (see rocks, water, paths)
- WASD moves the farmer on desktop
- Trees grow and become harvestable at Mature stage
- Harvesting gives resources (visible in resource bar)
- Stamina gauge shows on right side
- Tool belt shows at bottom right
- Closing and reopening the tab preserves trees (save/load works)

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: wire Phase B systems into game loop (grid gen, harvest, save, keyboard)"
```

---

## Summary

| Task | What It Does | Files Changed | Tests Added |
|------|-------------|---------------|-------------|
| 1 | Tech debt cleanup | ~6 deleted, ~4 modified | 0 (build verification) |
| 2 | Grid generation | 2 new | 7 |
| 3 | Harvest cooldown system | 2 new, 1 modified | 8 |
| 4 | Desktop keyboard controls | 2 new | 5 |
| 5 | Save/load + ECS serialization | 2 new, 1 modified | 7 |
| 6 | Resource bar HUD | 1 new, 1 modified | 0 (visual) |
| 7 | Stamina gauge HUD | 1 new, 1 modified | 0 (visual) |
| 8 | Tool belt HUD | 1 new, 1 modified | 0 (visual) |
| 9 | Integration wiring | ~3 modified | 0 (verification) |
| **Total** | | ~25 files | **27 tests** |

**Estimated commits:** 9 atomic commits, one per task.

**What Phase B delivers:**
- Trees persist across sessions (save/load)
- Grid has varied terrain (rocks, water, paths)
- Harvest cooldown economy works end-to-end
- Desktop players can use keyboard
- HUD shows resources, stamina, and tool belt
- ~500 lines of dead code removed

**What Phase B does NOT include (Phase C+):**
- Species-specific 3D tree meshes (pine cones, willow strands, baobab bulge)
- Achievement system (15 achievements)
- Prestige system (level 25+)
- Weather events (rain, drought, windstorm)
- Level-based auto-unlocking (currently manual)
- Offline growth calculation
- PWA manifest + service worker
- Toast notification system
- Floating number particles (+XP, +Timber)
