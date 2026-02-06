# Phase A: Foundation Alignment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the core game systems with the canonical spec (GROVEKEEPER_BUILD_PROMPT.md) — growth model, resource economy, stamina, seeded RNG, grid math, tree catalog, and tool definitions.

**Architecture:** All changes are to the game's data layer and pure systems. No 3D scene or UI changes in this phase. The ECS entity model is updated to match the spec's component interfaces. The Zustand store gains resource types. Pure utility modules are added for seeded RNG and grid math.

**Tech Stack:** TypeScript, Miniplex ECS, Zustand, Vitest (TDD)

---

## Task 1: Seeded RNG Utility

Creates the foundational `seedRNG.ts` utility that later tasks depend on (tree meshes, grid generation). Pure functions, no side effects, easiest place to start.

**Files:**
- Create: `src/game/utils/seedRNG.ts`
- Test: `src/game/utils/seedRNG.test.ts`

**Step 1: Write the failing test**

```typescript
// src/game/utils/seedRNG.test.ts
import { describe, it, expect } from "vitest";
import { createRNG, hashString } from "./seedRNG";

describe("seedRNG", () => {
  describe("createRNG", () => {
    it("returns a function", () => {
      const rng = createRNG(42);
      expect(typeof rng).toBe("function");
    });

    it("returns numbers between 0 and 1", () => {
      const rng = createRNG(42);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it("is deterministic — same seed produces same sequence", () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);
      for (let i = 0; i < 50; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it("different seeds produce different sequences", () => {
      const rng1 = createRNG(1);
      const rng2 = createRNG(2);
      const vals1 = Array.from({ length: 10 }, () => rng1());
      const vals2 = Array.from({ length: 10 }, () => rng2());
      expect(vals1).not.toEqual(vals2);
    });
  });

  describe("hashString", () => {
    it("returns a number", () => {
      expect(typeof hashString("oak-3-5")).toBe("number");
    });

    it("is deterministic", () => {
      expect(hashString("oak-3-5")).toBe(hashString("oak-3-5"));
    });

    it("returns different values for different inputs", () => {
      expect(hashString("oak-3-5")).not.toBe(hashString("oak-3-6"));
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- seedRNG --run`
Expected: FAIL — module `./seedRNG` not found

**Step 3: Write minimal implementation**

```typescript
// src/game/utils/seedRNG.ts

/**
 * Mulberry32 PRNG — deterministic pseudo-random number generator.
 * Used for tree mesh variation so the same tree at the same position
 * always looks identical across saves and sessions.
 *
 * @param seed - Integer seed value
 * @returns A function that returns the next pseudo-random number in [0, 1)
 */
export function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple string hash (djb2 variant) — converts a string to a 32-bit integer.
 * Used to derive mesh seeds from `speciesId-col-row`.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- seedRNG --run`
Expected: PASS — all 6 tests pass

**Step 5: Commit**

```bash
git add src/game/utils/seedRNG.ts src/game/utils/seedRNG.test.ts
git commit -m "feat: add seeded RNG utility (mulberry32 + string hash)"
```

---

## Task 2: Grid Math Utilities

Pure math functions for coordinate conversion, bounds checking, and spatial queries. No dependencies on ECS or game state.

**Files:**
- Create: `src/game/utils/gridMath.ts`
- Test: `src/game/utils/gridMath.test.ts`

**Step 1: Write the failing test**

```typescript
// src/game/utils/gridMath.test.ts
import { describe, it, expect } from "vitest";
import {
  gridToWorld,
  worldToGrid,
  isInBounds,
  gridToIndex,
  indexToGrid,
  tileCenterWorld,
  gridDistance,
  tilesInRadius,
} from "./gridMath";

describe("gridMath", () => {
  describe("gridToWorld", () => {
    it("converts grid coords to world coords", () => {
      expect(gridToWorld(3, 5)).toEqual({ x: 3, z: 5 });
    });

    it("respects tile size", () => {
      expect(gridToWorld(3, 5, 2)).toEqual({ x: 6, z: 10 });
    });
  });

  describe("worldToGrid", () => {
    it("converts world coords to grid coords", () => {
      expect(worldToGrid(3.2, 5.7)).toEqual({ col: 3, row: 6 });
    });

    it("rounds to nearest grid cell", () => {
      expect(worldToGrid(2.4, 3.6)).toEqual({ col: 2, row: 4 });
    });
  });

  describe("isInBounds", () => {
    it("returns true for valid positions", () => {
      expect(isInBounds({ col: 0, row: 0 }, 12)).toBe(true);
      expect(isInBounds({ col: 11, row: 11 }, 12)).toBe(true);
    });

    it("returns false for out-of-bounds positions", () => {
      expect(isInBounds({ col: -1, row: 0 }, 12)).toBe(false);
      expect(isInBounds({ col: 12, row: 0 }, 12)).toBe(false);
      expect(isInBounds({ col: 0, row: 12 }, 12)).toBe(false);
    });
  });

  describe("gridToIndex / indexToGrid", () => {
    it("converts grid position to flat index", () => {
      expect(gridToIndex(3, 2, 12)).toBe(27); // 2*12 + 3
    });

    it("converts flat index back to grid position", () => {
      expect(indexToGrid(27, 12)).toEqual({ col: 3, row: 2 });
    });

    it("round-trips correctly", () => {
      const col = 7, row = 9, size = 12;
      const idx = gridToIndex(col, row, size);
      expect(indexToGrid(idx, size)).toEqual({ col, row });
    });
  });

  describe("tileCenterWorld", () => {
    it("returns center of tile in world coords", () => {
      expect(tileCenterWorld(3, 5)).toEqual({ x: 3.5, z: 5.5 });
    });
  });

  describe("gridDistance", () => {
    it("computes Manhattan distance", () => {
      expect(gridDistance({ col: 0, row: 0 }, { col: 3, row: 4 })).toBe(7);
    });

    it("returns 0 for same position", () => {
      expect(gridDistance({ col: 5, row: 5 }, { col: 5, row: 5 })).toBe(0);
    });
  });

  describe("tilesInRadius", () => {
    it("returns tiles within Chebyshev distance", () => {
      const tiles = tilesInRadius({ col: 5, row: 5 }, 1, 12);
      expect(tiles).toHaveLength(9); // 3x3 block
      expect(tiles).toContainEqual({ col: 5, row: 5 });
      expect(tiles).toContainEqual({ col: 4, row: 4 });
      expect(tiles).toContainEqual({ col: 6, row: 6 });
    });

    it("clips to grid bounds", () => {
      const tiles = tilesInRadius({ col: 0, row: 0 }, 1, 12);
      expect(tiles).toHaveLength(4); // corner — only 2x2
      expect(tiles.every((t) => t.col >= 0 && t.row >= 0)).toBe(true);
    });

    it("radius 0 returns only the center tile", () => {
      const tiles = tilesInRadius({ col: 5, row: 5 }, 0, 12);
      expect(tiles).toHaveLength(1);
      expect(tiles[0]).toEqual({ col: 5, row: 5 });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- gridMath --run`
Expected: FAIL — module `./gridMath` not found

**Step 3: Write minimal implementation**

```typescript
// src/game/utils/gridMath.ts

export interface GridPosition {
  col: number;
  row: number;
}

export interface WorldPosition {
  x: number;
  z: number;
}

export function gridToWorld(col: number, row: number, tileSize = 1): WorldPosition {
  return { x: col * tileSize, z: row * tileSize };
}

export function worldToGrid(x: number, z: number, tileSize = 1): GridPosition {
  return { col: Math.round(x / tileSize), row: Math.round(z / tileSize) };
}

export function isInBounds(pos: GridPosition, gridSize: number): boolean {
  return pos.col >= 0 && pos.col < gridSize && pos.row >= 0 && pos.row < gridSize;
}

export function gridToIndex(col: number, row: number, gridSize: number): number {
  return row * gridSize + col;
}

export function indexToGrid(index: number, gridSize: number): GridPosition {
  return { col: index % gridSize, row: Math.floor(index / gridSize) };
}

export function tileCenterWorld(col: number, row: number, tileSize = 1): WorldPosition {
  return { x: col * tileSize + tileSize / 2, z: row * tileSize + tileSize / 2 };
}

export function gridDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function tilesInRadius(
  center: GridPosition,
  radius: number,
  gridSize: number,
): GridPosition[] {
  const result: GridPosition[] = [];
  for (let row = center.row - radius; row <= center.row + radius; row++) {
    for (let col = center.col - radius; col <= center.col + radius; col++) {
      if (isInBounds({ col, row }, gridSize)) {
        result.push({ col, row });
      }
    }
  }
  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- gridMath --run`
Expected: PASS — all 12 tests pass

**Step 5: Commit**

```bash
git add src/game/utils/gridMath.ts src/game/utils/gridMath.test.ts
git commit -m "feat: add grid math utilities (coordinate conversion, spatial queries)"
```

---

## Task 3: Resource Type System

Replaces the single `coins` field with the spec's four-resource economy (Timber, Sap, Fruit, Acorns). Updates the Zustand store with `resources`, `seeds`, `addResource`, `spendResource`, `addSeed`, `spendSeed`.

**Files:**
- Create: `src/game/constants/resources.ts`
- Modify: `src/game/stores/gameStore.ts`
- Modify: `src/game/stores/gameStore.test.ts`

**Step 1: Write the resource constants**

```typescript
// src/game/constants/resources.ts
export type ResourceType = "timber" | "sap" | "fruit" | "acorns";

export const RESOURCE_TYPES: ResourceType[] = ["timber", "sap", "fruit", "acorns"];

export const RESOURCE_INFO: Record<ResourceType, { name: string; icon: string }> = {
  timber: { name: "Timber", icon: "tree" },
  sap: { name: "Sap", icon: "droplet" },
  fruit: { name: "Fruit", icon: "apple" },
  acorns: { name: "Acorns", icon: "nut" },
};

export function emptyResources(): Record<ResourceType, number> {
  return { timber: 0, sap: 0, fruit: 0, acorns: 0 };
}
```

**Step 2: Write the failing tests for new store actions**

Add the following tests to `src/game/stores/gameStore.test.ts`:

```typescript
// ADD to the existing test file after the existing tests:

describe("Resource system", () => {
  it("starts with zero resources", () => {
    const state = useGameStore.getState();
    expect(state.resources).toEqual({ timber: 0, sap: 0, fruit: 0, acorns: 0 });
  });

  it("addResource increases a specific resource", () => {
    useGameStore.getState().addResource("timber", 10);
    expect(useGameStore.getState().resources.timber).toBe(10);
  });

  it("spendResource decreases a specific resource", () => {
    useGameStore.getState().addResource("sap", 20);
    const success = useGameStore.getState().spendResource("sap", 15);
    expect(success).toBe(true);
    expect(useGameStore.getState().resources.sap).toBe(5);
  });

  it("spendResource returns false if insufficient", () => {
    useGameStore.getState().addResource("fruit", 5);
    const success = useGameStore.getState().spendResource("fruit", 10);
    expect(success).toBe(false);
    expect(useGameStore.getState().resources.fruit).toBe(5);
  });
});

describe("Seed inventory", () => {
  it("starts with 10 white-oak seeds", () => {
    expect(useGameStore.getState().seeds["white-oak"]).toBe(10);
  });

  it("addSeed increases seed count", () => {
    useGameStore.getState().addSeed("elder-pine", 5);
    expect(useGameStore.getState().seeds["elder-pine"]).toBe(5);
  });

  it("spendSeed decreases seed count", () => {
    useGameStore.getState().addSeed("cherry-blossom", 3);
    const success = useGameStore.getState().spendSeed("cherry-blossom", 1);
    expect(success).toBe(true);
    expect(useGameStore.getState().seeds["cherry-blossom"]).toBe(2);
  });

  it("spendSeed returns false if insufficient", () => {
    const success = useGameStore.getState().spendSeed("redwood", 1);
    expect(success).toBe(false);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm test -- gameStore --run`
Expected: FAIL — `resources` and `addResource` not found on state

**Step 4: Update the gameStore implementation**

Modify `src/game/stores/gameStore.ts`:

1. Add import: `import { type ResourceType, emptyResources } from "../constants/resources";`
2. Add to `GameState` interface:
   - `resources: Record<ResourceType, number>;`
   - `seeds: Record<string, number>;`
   - `addResource: (type: ResourceType, amount: number) => void;`
   - `spendResource: (type: ResourceType, amount: number) => boolean;`
   - `addSeed: (speciesId: string, amount: number) => void;`
   - `spendSeed: (speciesId: string, amount: number) => boolean;`
3. Add to `initialState`:
   - `resources: emptyResources(),`
   - `seeds: { "white-oak": 10 } as Record<string, number>,`
4. Add action implementations to the store:
   ```typescript
   addResource: (type, amount) =>
     set((state) => ({
       resources: { ...state.resources, [type]: state.resources[type] + amount },
     })),

   spendResource: (type, amount) => {
     const current = get().resources[type];
     if (current < amount) return false;
     set((state) => ({
       resources: { ...state.resources, [type]: state.resources[type] - amount },
     }));
     return true;
   },

   addSeed: (speciesId, amount) =>
     set((state) => ({
       seeds: { ...state.seeds, [speciesId]: (state.seeds[speciesId] ?? 0) + amount },
     })),

   spendSeed: (speciesId, amount) => {
     const current = get().seeds[speciesId] ?? 0;
     if (current < amount) return false;
     set((state) => ({
       seeds: { ...state.seeds, [speciesId]: (state.seeds[speciesId] ?? 0) - amount },
     }));
     return true;
   },
   ```
5. Note: The store's `persist` callback must change from `(set)` to `(set, get)` so `spendResource` and `spendSeed` can read current state.

**Step 5: Run test to verify it passes**

Run: `pnpm test -- gameStore --run`
Expected: PASS — all existing + 7 new tests pass

**Step 6: Commit**

```bash
git add src/game/constants/resources.ts src/game/stores/gameStore.ts src/game/stores/gameStore.test.ts
git commit -m "feat: add resource economy (Timber/Sap/Fruit/Acorns) and seed inventory"
```

---

## Task 4: Tree Species Catalog Alignment

Replaces the current 6-species catalog with the spec's 8-species catalog using the `TreeSpeciesData` interface from spec section 14. Each species gets difficulty stars, per-stage growth times, yield arrays, harvest cycle, seed cost, evergreen flag, and mesh params.

**Files:**
- Rewrite: `src/game/constants/trees.ts`
- Modify: `src/game/constants/trees.test.ts` (create if needed)

**Step 1: Write the failing test**

```typescript
// src/game/constants/trees.test.ts
import { describe, it, expect } from "vitest";
import { TREE_SPECIES, getSpeciesById, type TreeSpeciesData } from "./trees";

describe("Tree Species Catalog", () => {
  it("has exactly 8 base species", () => {
    expect(TREE_SPECIES).toHaveLength(8);
  });

  it("every species has required fields", () => {
    for (const species of TREE_SPECIES) {
      expect(species.id).toBeTruthy();
      expect(species.name).toBeTruthy();
      expect(species.difficulty).toBeGreaterThanOrEqual(1);
      expect(species.difficulty).toBeLessThanOrEqual(5);
      expect(species.unlockLevel).toBeGreaterThanOrEqual(1);
      expect(species.baseGrowthTimes).toHaveLength(5);
      expect(species.yield.length).toBeGreaterThan(0);
      expect(species.harvestCycleSec).toBeGreaterThan(0);
      expect(typeof species.evergreen).toBe("boolean");
      expect(species.meshParams.trunkHeight).toBeGreaterThan(0);
      expect(species.meshParams.canopyRadius).toBeGreaterThan(0);
    }
  });

  it("includes white-oak as starter species", () => {
    const oak = getSpeciesById("white-oak");
    expect(oak).toBeDefined();
    expect(oak!.difficulty).toBe(1);
    expect(oak!.unlockLevel).toBe(1);
  });

  it("includes all 8 spec species", () => {
    const ids = TREE_SPECIES.map((s) => s.id);
    expect(ids).toContain("white-oak");
    expect(ids).toContain("weeping-willow");
    expect(ids).toContain("elder-pine");
    expect(ids).toContain("cherry-blossom");
    expect(ids).toContain("ghost-birch");
    expect(ids).toContain("redwood");
    expect(ids).toContain("flame-maple");
    expect(ids).toContain("baobab");
  });

  it("elder-pine and redwood are evergreen", () => {
    expect(getSpeciesById("elder-pine")!.evergreen).toBe(true);
    expect(getSpeciesById("redwood")!.evergreen).toBe(true);
  });

  it("non-evergreen species are not marked evergreen", () => {
    expect(getSpeciesById("white-oak")!.evergreen).toBe(false);
    expect(getSpeciesById("cherry-blossom")!.evergreen).toBe(false);
  });

  it("getSpeciesById returns undefined for unknown id", () => {
    expect(getSpeciesById("nonexistent")).toBeUndefined();
  });

  it("white-oak has free seed cost", () => {
    const oak = getSpeciesById("white-oak")!;
    const totalCost = Object.values(oak.seedCost).reduce((a, b) => a + b, 0);
    expect(totalCost).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- trees --run`
Expected: FAIL — `TreeSpeciesData` not exported, `TREE_SPECIES` doesn't have 8 entries

**Step 3: Rewrite the trees.ts module**

```typescript
// src/game/constants/trees.ts
import type { ResourceType } from "./resources";

export interface TreeSpeciesData {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  unlockLevel: number;
  biome: string;
  baseGrowthTimes: [number, number, number, number, number]; // seconds per stage 0-4
  yield: { resource: ResourceType; amount: number }[];
  harvestCycleSec: number;
  seedCost: Record<string, number>;
  special: string;
  evergreen: boolean;
  meshParams: {
    trunkHeight: number;
    trunkRadius: number;
    canopyRadius: number;
    canopySegments: number;
    color: { trunk: string; canopy: string };
  };
}

export const TREE_SPECIES: TreeSpeciesData[] = [
  {
    id: "white-oak",
    name: "White Oak",
    difficulty: 1,
    unlockLevel: 1,
    biome: "Temperate",
    baseGrowthTimes: [10, 15, 20, 25, 30],
    yield: [{ resource: "timber", amount: 2 }],
    harvestCycleSec: 45,
    seedCost: {},
    special: "Starter tree, reliable",
    evergreen: false,
    meshParams: {
      trunkHeight: 1.8,
      trunkRadius: 0.15,
      canopyRadius: 0.9,
      canopySegments: 8,
      color: { trunk: "#5D4037", canopy: "#388E3C" },
    },
  },
  {
    id: "weeping-willow",
    name: "Weeping Willow",
    difficulty: 2,
    unlockLevel: 2,
    biome: "Wetland",
    baseGrowthTimes: [12, 18, 24, 30, 36],
    yield: [{ resource: "sap", amount: 3 }],
    harvestCycleSec: 60,
    seedCost: { sap: 5 },
    special: "+30% yield near water tiles",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.0,
      trunkRadius: 0.12,
      canopyRadius: 1.1,
      canopySegments: 10,
      color: { trunk: "#6D4C41", canopy: "#66BB6A" },
    },
  },
  {
    id: "elder-pine",
    name: "Elder Pine",
    difficulty: 2,
    unlockLevel: 3,
    biome: "Mountain",
    baseGrowthTimes: [12, 16, 22, 28, 35],
    yield: [
      { resource: "timber", amount: 2 },
      { resource: "sap", amount: 1 },
    ],
    harvestCycleSec: 50,
    seedCost: { timber: 5 },
    special: "Grows at 30% in Winter",
    evergreen: true,
    meshParams: {
      trunkHeight: 2.2,
      trunkRadius: 0.13,
      canopyRadius: 0.7,
      canopySegments: 6,
      color: { trunk: "#4E342E", canopy: "#1B5E20" },
    },
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    difficulty: 3,
    unlockLevel: 5,
    biome: "Temperate",
    baseGrowthTimes: [15, 22, 30, 38, 45],
    yield: [{ resource: "fruit", amount: 2 }],
    harvestCycleSec: 75,
    seedCost: { fruit: 8 },
    special: "Beauty Aura: +10% XP within 1 tile",
    evergreen: false,
    meshParams: {
      trunkHeight: 1.6,
      trunkRadius: 0.1,
      canopyRadius: 1.0,
      canopySegments: 10,
      color: { trunk: "#3E2723", canopy: "#F48FB1" },
    },
  },
  {
    id: "ghost-birch",
    name: "Ghost Birch",
    difficulty: 3,
    unlockLevel: 6,
    biome: "Tundra Edge",
    baseGrowthTimes: [14, 20, 28, 36, 42],
    yield: [
      { resource: "sap", amount: 2 },
      { resource: "acorns", amount: 1 },
    ],
    harvestCycleSec: 55,
    seedCost: { sap: 6, acorns: 2 },
    special: "50% growth in Winter; night glow",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.0,
      trunkRadius: 0.1,
      canopyRadius: 0.8,
      canopySegments: 8,
      color: { trunk: "#E0E0E0", canopy: "#B0BEC5" },
    },
  },
  {
    id: "redwood",
    name: "Redwood",
    difficulty: 4,
    unlockLevel: 8,
    biome: "Coastal",
    baseGrowthTimes: [20, 30, 45, 60, 75],
    yield: [{ resource: "timber", amount: 5 }],
    harvestCycleSec: 120,
    seedCost: { timber: 15 },
    special: "Tallest; Old Growth: +1 Acorn/cycle",
    evergreen: true,
    meshParams: {
      trunkHeight: 3.0,
      trunkRadius: 0.2,
      canopyRadius: 1.0,
      canopySegments: 8,
      color: { trunk: "#8D6E63", canopy: "#2E7D32" },
    },
  },
  {
    id: "flame-maple",
    name: "Flame Maple",
    difficulty: 4,
    unlockLevel: 10,
    biome: "Highland",
    baseGrowthTimes: [18, 26, 36, 48, 58],
    yield: [{ resource: "fruit", amount: 3 }],
    harvestCycleSec: 90,
    seedCost: { fruit: 12 },
    special: "Beauty Aura 2-tile; 2x yield in Autumn",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.0,
      trunkRadius: 0.14,
      canopyRadius: 1.1,
      canopySegments: 10,
      color: { trunk: "#6D4C41", canopy: "#E65100" },
    },
  },
  {
    id: "baobab",
    name: "Baobab",
    difficulty: 5,
    unlockLevel: 12,
    biome: "Savanna",
    baseGrowthTimes: [25, 35, 50, 65, 80],
    yield: [
      { resource: "timber", amount: 2 },
      { resource: "sap", amount: 2 },
      { resource: "fruit", amount: 2 },
    ],
    harvestCycleSec: 150,
    seedCost: { timber: 10, sap: 10, fruit: 10 },
    special: "Drought resist; all resources; 2-tile footprint",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.5,
      trunkRadius: 0.3,
      canopyRadius: 1.3,
      canopySegments: 8,
      color: { trunk: "#795548", canopy: "#558B2F" },
    },
  },
];

export const getSpeciesById = (id: string): TreeSpeciesData | undefined =>
  TREE_SPECIES.find((s) => s.id === id);

// Backwards-compatible alias for existing code that uses getTreeById
export const getTreeById = getSpeciesById;
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- trees --run`
Expected: PASS — all 9 tests pass

**Step 5: Commit**

```bash
git add src/game/constants/trees.ts src/game/constants/trees.test.ts
git commit -m "feat: align tree species catalog with spec (8 species, yields, growth times)"
```

---

## Task 5: Tool Definitions Alignment

Updates tool definitions to match spec section 17: 8 tools with stamina costs and level-based unlocking instead of coin-based unlocking.

**Files:**
- Rewrite: `src/game/constants/tools.ts`
- Create: `src/game/constants/tools.test.ts`

**Step 1: Write the failing test**

```typescript
// src/game/constants/tools.test.ts
import { describe, it, expect } from "vitest";
import { TOOLS, getToolById, type ToolData } from "./tools";

describe("Tool Definitions", () => {
  it("has exactly 8 tools", () => {
    expect(TOOLS).toHaveLength(8);
  });

  it("every tool has required fields", () => {
    for (const tool of TOOLS) {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(typeof tool.staminaCost).toBe("number");
      expect(tool.staminaCost).toBeGreaterThanOrEqual(0);
      expect(tool.unlockLevel).toBeGreaterThanOrEqual(1);
    }
  });

  it("includes all 8 spec tools", () => {
    const ids = TOOLS.map((t) => t.id);
    expect(ids).toContain("trowel");
    expect(ids).toContain("watering-can");
    expect(ids).toContain("almanac");
    expect(ids).toContain("pruning-shears");
    expect(ids).toContain("seed-pouch");
    expect(ids).toContain("shovel");
    expect(ids).toContain("axe");
    expect(ids).toContain("compost-bin");
  });

  it("trowel and watering-can unlock at level 1", () => {
    expect(getToolById("trowel")!.unlockLevel).toBe(1);
    expect(getToolById("watering-can")!.unlockLevel).toBe(1);
  });

  it("almanac costs 0 stamina", () => {
    expect(getToolById("almanac")!.staminaCost).toBe(0);
  });

  it("seed-pouch costs 0 stamina", () => {
    expect(getToolById("seed-pouch")!.staminaCost).toBe(0);
  });

  it("axe is most expensive (10 stamina)", () => {
    expect(getToolById("axe")!.staminaCost).toBe(10);
  });

  it("getToolById returns undefined for unknown id", () => {
    expect(getToolById("nonexistent")).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tools --run`
Expected: FAIL — `ToolData` not exported, tools don't have `staminaCost`

**Step 3: Rewrite tools.ts**

```typescript
// src/game/constants/tools.ts

export interface ToolData {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockLevel: number;
  staminaCost: number;
  action: string;
}

export const TOOLS: ToolData[] = [
  {
    id: "trowel",
    name: "Trowel",
    description: "Plant seed on empty tile",
    icon: "hammer",
    unlockLevel: 1,
    staminaCost: 5,
    action: "PLANT",
  },
  {
    id: "watering-can",
    name: "Watering Can",
    description: "Water sprout/sapling for growth boost",
    icon: "droplet",
    unlockLevel: 1,
    staminaCost: 3,
    action: "WATER",
  },
  {
    id: "almanac",
    name: "Almanac",
    description: "View tree stats and species info",
    icon: "book-open",
    unlockLevel: 2,
    staminaCost: 0,
    action: "INSPECT",
  },
  {
    id: "pruning-shears",
    name: "Pruning Shears",
    description: "Prune mature tree for yield bonus",
    icon: "scissors",
    unlockLevel: 3,
    staminaCost: 4,
    action: "PRUNE",
  },
  {
    id: "seed-pouch",
    name: "Seed Pouch",
    description: "Open seed inventory",
    icon: "leaf",
    unlockLevel: 4,
    staminaCost: 0,
    action: "SEEDS",
  },
  {
    id: "shovel",
    name: "Shovel",
    description: "Clear blocked tiles, dig irrigation",
    icon: "shovel",
    unlockLevel: 5,
    staminaCost: 8,
    action: "CLEAR",
  },
  {
    id: "axe",
    name: "Axe",
    description: "Chop old growth for big timber, clear old trees",
    icon: "axe",
    unlockLevel: 7,
    staminaCost: 10,
    action: "CHOP",
  },
  {
    id: "compost-bin",
    name: "Compost Bin",
    description: "Convert waste to fertilizer (2x growth for 1 cycle)",
    icon: "recycle",
    unlockLevel: 10,
    staminaCost: 6,
    action: "COMPOST",
  },
];

export const getToolById = (id: string): ToolData | undefined =>
  TOOLS.find((t) => t.id === id);
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- tools --run`
Expected: PASS — all 8 tests pass

**Step 5: Update gameStore initial tool references**

The `gameStore.ts` currently uses `unlockedTools: ["shovel", "wateringCan"]`. Update to use the new spec IDs: `["trowel", "watering-can"]`. Also update `selectedTool: "trowel"` and `unlockedSpecies: ["white-oak"]`.

Run: `pnpm test -- gameStore --run`
Verify the existing tests still pass after updating initial values. Some existing tests may need updated expectations for the new tool/species IDs.

**Step 6: Commit**

```bash
git add src/game/constants/tools.ts src/game/constants/tools.test.ts src/game/stores/gameStore.ts src/game/stores/gameStore.test.ts
git commit -m "feat: align tool definitions with spec (8 tools, stamina costs, unlock levels)"
```

---

## Task 6: Growth System Refactor (5-Stage Model)

The biggest change in Phase A. Replaces the current flat `growthProgress` (0 to 1+, 7 named stages) with the spec's staged model: 5 discrete stages (0-4), each with its own progress [0, 1), difficulty multipliers, season multipliers, and water bonus.

**Files:**
- Rewrite: `src/game/constants/config.ts` — replace `GROWTH_STAGES` with spec's stage data
- Rewrite: `src/game/systems/growth.ts` — new growth formula
- Rewrite: `src/game/systems/growth.test.ts` — comprehensive TDD
- Modify: `src/game/ecs/world.ts` — update `TreeComponent` to match spec's `GrowthStage`
- Modify: `src/game/ecs/archetypes.ts` — update `createTreeEntity` for new component shape

**Step 1: Update config.ts with spec's stage model**

Replace the `GROWTH_STAGES` array in `src/game/constants/config.ts`:

```typescript
// Replace the current GROWTH_STAGES with:
export const STAGE_NAMES = ["Seed", "Sprout", "Sapling", "Mature", "Old Growth"] as const;
export type StageName = (typeof STAGE_NAMES)[number];

export const STAGE_VISUALS = [
  { name: "Seed",       scale: 0.0  },  // stage 0: ground decal only
  { name: "Sprout",     scale: 0.15 },  // stage 1: tiny shoot
  { name: "Sapling",    scale: 0.4  },  // stage 2: small trunk + 1 canopy
  { name: "Mature",     scale: 0.8  },  // stage 3: full trunk + 2-3 canopy
  { name: "Old Growth", scale: 1.2  },  // stage 4: thick trunk + 3 canopy
] as const;

export const DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
  4: 2.0,
  5: 2.5,
};

export const SEASON_GROWTH_MULTIPLIERS: Record<string, number> = {
  spring: 1.5,
  summer: 1.0,
  autumn: 0.8,
  winter: 0.0,
};

export const WATER_BONUS = 1.3;
export const DROUGHT_PENALTY = 0.5;

// Max stage index
export const MAX_STAGE = 4;
```

**Step 2: Update ECS TreeComponent in world.ts**

Replace `TreeComponent` in `src/game/ecs/world.ts`:

```typescript
export interface TreeComponent {
  speciesId: string;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;        // [0, 1) within current stage
  watered: boolean;
  totalGrowthTime: number; // cumulative seconds grown
  plantedAt: number;
  meshSeed: number;        // for deterministic procedural generation
}
```

**Step 3: Update archetypes.ts**

Update `createTreeEntity` in `src/game/ecs/archetypes.ts`:

```typescript
import { hashString } from "../utils/seedRNG";

export const createTreeEntity = (
  gridX: number,
  gridZ: number,
  speciesId: string,
): Entity => ({
  id: generateEntityId(),
  position: { x: gridX, y: 0, z: gridZ },
  tree: {
    speciesId,
    stage: 0,
    progress: 0,
    watered: false,
    totalGrowthTime: 0,
    plantedAt: Date.now(),
    meshSeed: hashString(`${speciesId}-${gridX}-${gridZ}`),
  },
  renderable: { meshId: null, visible: true, scale: 0.0 },
});
```

**Step 4: Write the failing growth system tests**

Replace `src/game/systems/growth.test.ts` entirely:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getStageScale, calcGrowthRate, growthSystem } from "./growth";
import { world } from "../ecs/world";
import { createTreeEntity } from "../ecs/archetypes";

describe("Growth System (5-Stage)", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("getStageScale", () => {
    it("returns 0.0 for Seed (stage 0)", () => {
      expect(getStageScale(0, 0)).toBe(0.0);
    });

    it("returns 0.15 for Sprout (stage 1) at 0 progress", () => {
      expect(getStageScale(1, 0)).toBeCloseTo(0.15);
    });

    it("interpolates partially toward next stage", () => {
      // At stage 1 with 0.5 progress, should be between 0.15 and 0.4
      const scale = getStageScale(1, 0.5);
      expect(scale).toBeGreaterThan(0.15);
      expect(scale).toBeLessThan(0.4);
    });

    it("returns 1.2 for Old Growth (stage 4)", () => {
      expect(getStageScale(4, 0)).toBeCloseTo(1.2);
    });
  });

  describe("calcGrowthRate", () => {
    it("returns positive rate for spring with easy tree", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "spring",
        watered: false,
        evergreen: false,
      });
      expect(rate).toBeGreaterThan(0);
    });

    it("returns 0 for non-evergreen in winter", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "winter",
        watered: false,
        evergreen: false,
      });
      expect(rate).toBe(0);
    });

    it("returns > 0 for evergreen in winter (0.3x)", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "winter",
        watered: false,
        evergreen: true,
      });
      expect(rate).toBeGreaterThan(0);
    });

    it("watered trees grow faster (1.3x bonus)", () => {
      const dry = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      const wet = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: true,
        evergreen: false,
      });
      expect(wet / dry).toBeCloseTo(1.3);
    });

    it("harder trees grow slower", () => {
      const easy = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      const hard = calcGrowthRate({
        baseTime: 15,
        difficulty: 3,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(easy).toBeGreaterThan(hard);
    });

    it("spring gives 1.5x bonus", () => {
      const summer = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      const spring = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "spring",
        watered: false,
        evergreen: false,
      });
      expect(spring / summer).toBeCloseTo(1.5);
    });
  });

  describe("growthSystem integration", () => {
    it("increases progress over time", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      growthSystem(1, "summer");

      expect(tree.tree!.progress).toBeGreaterThan(0);
    });

    it("advances stage when progress reaches 1", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.progress = 0.99;
      tree.tree!.stage = 1;
      world.add(tree);

      // Large delta to push past 1.0
      growthSystem(100, "spring");

      expect(tree.tree!.stage).toBeGreaterThan(1);
      expect(tree.tree!.progress).toBeLessThan(1);
    });

    it("stops at max stage (4)", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 4;
      tree.tree!.progress = 0.5;
      world.add(tree);

      growthSystem(1000, "spring");

      expect(tree.tree!.stage).toBe(4);
    });

    it("resets watered to false on stage advance", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 1;
      tree.tree!.progress = 0.99;
      tree.tree!.watered = true;
      world.add(tree);

      growthSystem(100, "spring");

      expect(tree.tree!.watered).toBe(false);
    });

    it("updates renderable scale", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 2;
      tree.tree!.progress = 0;
      world.add(tree);

      growthSystem(0, "summer");

      expect(tree.renderable!.scale).toBeCloseTo(0.4);
    });

    it("tracks totalGrowthTime", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      growthSystem(5, "summer");

      expect(tree.tree!.totalGrowthTime).toBe(5);
    });
  });
});
```

**Step 5: Run test to verify it fails**

Run: `pnpm test -- growth --run`
Expected: FAIL — `calcGrowthRate`, `getStageScale` not found

**Step 6: Rewrite growth.ts**

```typescript
// src/game/systems/growth.ts
import {
  DIFFICULTY_MULTIPLIERS,
  MAX_STAGE,
  SEASON_GROWTH_MULTIPLIERS,
  STAGE_VISUALS,
  WATER_BONUS,
} from "../constants/config";
import { getSpeciesById } from "../constants/trees";
import { treesQuery } from "../ecs/world";

/**
 * Calculate the visual scale for a tree at a given stage + progress.
 * Smoothly interpolates toward the next stage using progress * 0.3 as partial preview.
 */
export function getStageScale(stage: number, progress: number): number {
  const baseScale = STAGE_VISUALS[stage].scale;
  if (stage >= MAX_STAGE) return baseScale;

  const nextScale = STAGE_VISUALS[stage + 1].scale;
  const partialPreview = progress * 0.3;
  return baseScale + (nextScale - baseScale) * partialPreview;
}

export interface GrowthRateParams {
  baseTime: number;
  difficulty: number;
  season: string;
  watered: boolean;
  evergreen: boolean;
  speciesId?: string;
}

/**
 * Calculates growth rate (progress per second) for a tree.
 * Formula from spec §15:
 *   progressPerTick = deltaTime * seasonBonus * waterBonus / (baseTime * difficultyMultiplier)
 * Returns the rate per second (without deltaTime).
 */
export function calcGrowthRate(params: GrowthRateParams): number {
  const { baseTime, difficulty, season, watered, evergreen, speciesId } = params;

  // Season multiplier
  let seasonMult = SEASON_GROWTH_MULTIPLIERS[season] ?? 1.0;

  // Evergreen override in winter
  if (season === "winter") {
    if (speciesId === "ghost-birch") {
      seasonMult = 0.5;
    } else if (evergreen) {
      seasonMult = 0.3;
    }
    // Otherwise stays 0.0 for non-evergreen
  }

  if (seasonMult === 0) return 0;

  // Difficulty multiplier
  const diffMult = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.0;

  // Water bonus
  const waterMult = watered ? WATER_BONUS : 1.0;

  // progressPerSecond = seasonBonus * waterBonus / (baseTime * difficultyMultiplier)
  return (seasonMult * waterMult) / (baseTime * diffMult);
}

/**
 * Growth system — runs every frame. Advances tree growth based on species,
 * difficulty, season, and watered state. Handles stage transitions.
 */
export function growthSystem(deltaTime: number, currentSeason: string): void {
  for (const entity of treesQuery) {
    if (!entity.tree || !entity.renderable) continue;

    const tree = entity.tree;

    // Don't grow past max stage
    if (tree.stage >= MAX_STAGE) {
      entity.renderable.scale = getStageScale(tree.stage, 0);
      continue;
    }

    const species = getSpeciesById(tree.speciesId);
    if (!species) continue;

    const baseTime = species.baseGrowthTimes[tree.stage];

    const rate = calcGrowthRate({
      baseTime,
      difficulty: species.difficulty,
      season: currentSeason,
      watered: tree.watered,
      evergreen: species.evergreen,
      speciesId: species.id,
    });

    if (rate <= 0) {
      entity.renderable.scale = getStageScale(tree.stage, tree.progress);
      continue;
    }

    // Advance progress
    tree.progress += rate * deltaTime;
    tree.totalGrowthTime += deltaTime;

    // Handle stage transition
    while (tree.progress >= 1 && tree.stage < MAX_STAGE) {
      tree.progress -= 1;
      tree.stage = (tree.stage + 1) as 0 | 1 | 2 | 3 | 4;
      tree.watered = false;
    }

    // Clamp progress at max stage
    if (tree.stage >= MAX_STAGE) {
      tree.progress = Math.min(tree.progress, 0.99);
    }

    // Update visual scale
    entity.renderable.scale = getStageScale(tree.stage, tree.progress);
  }
}
```

**Step 7: Run test to verify it passes**

Run: `pnpm test -- growth --run`
Expected: PASS — all 14 tests pass

**Step 8: Commit**

```bash
git add src/game/constants/config.ts src/game/systems/growth.ts src/game/systems/growth.test.ts src/game/ecs/world.ts src/game/ecs/archetypes.ts
git commit -m "refactor: 5-stage growth model with difficulty/season/water multipliers"
```

---

## Task 7: Stamina System

Adds the stamina system: ECS component on the farmer entity, regeneration at 2/sec, drain on tool use. Pure system + store integration.

**Files:**
- Create: `src/game/systems/stamina.ts`
- Create: `src/game/systems/stamina.test.ts`
- Modify: `src/game/ecs/world.ts` — add stamina fields to farmer/entity types
- Modify: `src/game/stores/gameStore.ts` — add stamina state
- Modify: `src/game/stores/gameStore.test.ts` — add stamina tests

**Step 1: Update ECS Entity with stamina fields**

Add to `Entity` interface in `src/game/ecs/world.ts`:

```typescript
// Add to Entity interface:
farmerState?: {
  stamina: number;
  maxStamina: number;
};
```

Update `PlayerComponent` or replace with `farmerState`.

Update `createPlayerEntity` in `archetypes.ts` to include:
```typescript
farmerState: {
  stamina: 100,
  maxStamina: 100,
},
```

Add query: `export const farmerQuery = world.with("farmerState", "position");`

**Step 2: Write the failing stamina system tests**

```typescript
// src/game/systems/stamina.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { staminaSystem, drainStamina } from "./stamina";
import { world } from "../ecs/world";
import { createPlayerEntity } from "../ecs/archetypes";

describe("Stamina System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("staminaSystem (regen)", () => {
    it("regenerates stamina at 2/sec", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 90;
      world.add(player);

      staminaSystem(1); // 1 second

      expect(player.farmerState!.stamina).toBe(92);
    });

    it("caps stamina at maxStamina", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 99;
      world.add(player);

      staminaSystem(5); // 5 seconds = +10, but capped at 100

      expect(player.farmerState!.stamina).toBe(100);
    });

    it("does not change stamina if already full", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 100;
      world.add(player);

      staminaSystem(1);

      expect(player.farmerState!.stamina).toBe(100);
    });
  });

  describe("drainStamina", () => {
    it("returns true and drains if enough stamina", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 50;
      world.add(player);

      const success = drainStamina(player, 10);

      expect(success).toBe(true);
      expect(player.farmerState!.stamina).toBe(40);
    });

    it("returns false if insufficient stamina", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 3;
      world.add(player);

      const success = drainStamina(player, 5);

      expect(success).toBe(false);
      expect(player.farmerState!.stamina).toBe(3); // unchanged
    });

    it("allows exact drain (stamina == cost)", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 10;
      world.add(player);

      const success = drainStamina(player, 10);

      expect(success).toBe(true);
      expect(player.farmerState!.stamina).toBe(0);
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm test -- stamina --run`
Expected: FAIL — module `./stamina` not found

**Step 4: Write the stamina system**

```typescript
// src/game/systems/stamina.ts
import type { Entity } from "../ecs/world";
import { farmerQuery } from "../ecs/world";

const STAMINA_REGEN_PER_SEC = 2;

/**
 * Regenerates farmer stamina at 2/sec up to maxStamina.
 * Called every frame from the game loop.
 */
export function staminaSystem(deltaTime: number): void {
  for (const entity of farmerQuery) {
    if (!entity.farmerState) continue;

    const fs = entity.farmerState;
    if (fs.stamina < fs.maxStamina) {
      fs.stamina = Math.min(
        fs.maxStamina,
        fs.stamina + STAMINA_REGEN_PER_SEC * deltaTime,
      );
    }
  }
}

/**
 * Attempts to drain stamina for a tool action.
 * Returns true if sufficient stamina was available (and drained).
 * Returns false if insufficient (no change).
 */
export function drainStamina(entity: Entity, cost: number): boolean {
  if (!entity.farmerState) return false;
  if (entity.farmerState.stamina < cost) return false;

  entity.farmerState.stamina -= cost;
  return true;
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm test -- stamina --run`
Expected: PASS — all 6 tests pass

**Step 6: Add stamina to Zustand store**

Add `stamina: number` and `maxStamina: number` to `gameStore.ts` state for persistence across sessions. Add actions `setStamina(value: number)`.

Update `gameStore.test.ts` with a basic stamina persistence test.

**Step 7: Commit**

```bash
git add src/game/systems/stamina.ts src/game/systems/stamina.test.ts src/game/ecs/world.ts src/game/ecs/archetypes.ts src/game/stores/gameStore.ts src/game/stores/gameStore.test.ts
git commit -m "feat: add stamina system (regen 2/sec, drain on tool use)"
```

---

## Task 8: Integration — Wire Systems Together

After all foundation pieces are in place, update the remaining references throughout the codebase so the game still compiles and runs. This task does NOT add UI changes — it ensures the data layer is consistent.

**Files:**
- Modify: `src/game/scenes/GameScene.tsx` — update growth system call signature, update tree planting to use new species data, wire stamina system into game loop
- Modify: `src/game/types.ts` — align or remove duplicate type definitions
- Modify: `src/game/ui/SeedSelect.tsx` — update species references
- Modify: `src/game/ui/ToolWheel.tsx` — update tool references

**Step 1: Update GameScene.tsx growth system call**

Find: `growthSystem(deltaTime)` → Replace with: `growthSystem(deltaTime, currentSeason)`

Where `currentSeason` comes from the time system or gameStore.

**Step 2: Update GameScene.tsx planting logic**

When a tree is planted, `createTreeEntity` now takes the new species IDs (e.g., `"white-oak"` instead of `"oak"`). Update species references in the planting flow.

**Step 3: Add stamina system to game loop**

In the render loop (after growth and harvest systems): `staminaSystem(deltaTime);`

**Step 4: Clean up types.ts**

The file `src/game/types.ts` has duplicate type definitions (e.g., `TreeComponent`, `Entity`) that diverge from `world.ts`. Either:
- Remove the duplicates and have everything import from `world.ts`
- Or update `types.ts` to re-export from `world.ts`

Choose the approach that minimizes import changes across the codebase.

**Step 5: Update SeedSelect.tsx species references**

The seed selection UI currently imports from the old `trees.ts`. Update to use the new `TreeSpeciesData` type and new species IDs.

**Step 6: Update ToolWheel.tsx tool references**

Same pattern: update to use new `ToolData` type and new tool IDs.

**Step 7: Run full test suite**

Run: `pnpm test --run`
Expected: ALL tests pass

**Step 8: Run TypeScript type check**

Run: `pnpm tsc`
Expected: No errors (or only pre-existing ones unrelated to Phase A changes)

**Step 9: Run dev server and verify game loads**

Run: `pnpm dev`
Manual check: game loads, main menu appears, can start a new game, trees can be planted.

**Step 10: Commit**

```bash
git add -A
git commit -m "chore: wire Phase A foundation systems into game loop"
```

---

## Summary

| Task | What It Does | Files Changed | Tests Added |
|------|-------------|---------------|-------------|
| 1 | Seeded RNG (mulberry32) | 2 new | 6 |
| 2 | Grid Math utilities | 2 new | 12 |
| 3 | Resource economy + seed inventory | 1 new, 2 modified | 7 |
| 4 | Tree species catalog (8 species) | 1 rewritten, 1 new | 9 |
| 5 | Tool definitions (8 tools) | 1 rewritten, 1 new | 8 |
| 6 | Growth system (5-stage model) | 5 modified | 14 |
| 7 | Stamina system | 2 new, 3 modified | 6 |
| 8 | Integration wiring | ~6 modified | 0 (verification only) |
| **Total** | | ~20 files | **62 tests** |

**Estimated commits:** 8 atomic commits, one per task.

**What this does NOT include (Phase B+):**
- UI changes (HUD resource bar, stamina gauge, tool belt)
- 3D mesh updates (species-specific tree shapes)
- Save/load with ECS serialization
- Grid generation with tile types (water, rock, path)
- Achievement or prestige systems
- Weather events

---

Plan complete and saved to `docs/plans/2025-02-06-phase-a-foundation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
