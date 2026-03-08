import {
  applyOfflineGrowthToChunkDeltas,
  calculateAllOfflineGrowth,
  calculateOfflineGrowth,
  type OfflineSpeciesData,
  type OfflineTreeState,
} from "@/game/systems/offlineGrowth";
import {
  chunkDiffs$,
  clearAllChunkDiffs,
  type PlantedTree,
  saveChunkDiff,
} from "@/game/world/chunkPersistence";

const whiteOakSpecies: OfflineSpeciesData = {
  difficulty: 1,
  baseGrowthTimes: [10, 15, 20, 25, 30],
  evergreen: false,
};

const hardSpecies: OfflineSpeciesData = {
  difficulty: 5,
  baseGrowthTimes: [25, 35, 50, 65, 80],
  evergreen: false,
};

function makeTree(stage: number, progress: number, speciesId = "white-oak"): OfflineTreeState {
  return { speciesId, stage, progress, watered: true };
}

function makePlantedTree(overrides?: Partial<PlantedTree>): PlantedTree {
  return {
    localX: 2,
    localZ: 3,
    speciesId: "white-oak",
    stage: 0,
    progress: 0,
    plantedAt: 1000,
    meshSeed: 42,
    ...overrides,
  };
}

const testLookup = (id: string): OfflineSpeciesData | undefined => {
  if (id === "white-oak") return whiteOakSpecies;
  if (id === "hard-tree") return hardSpecies;
  return undefined;
};

describe("offline growth system", () => {
  // ── calculateOfflineGrowth ─────────────────────────────────────

  describe("calculateOfflineGrowth", () => {
    it("advances growth for elapsed time", () => {
      const tree = makeTree(0, 0);
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies);
      // rate = 1.0 / (10 * 1.0) = 0.1/sec; 5 sec => progress 0.5
      expect(result.stage).toBe(0);
      expect(result.progress).toBeCloseTo(0.5, 6);
    });

    it("stages up when enough time passes", () => {
      const tree = makeTree(0, 0);
      // Stage 0 baseTime = 10, rate = 0.1/s, needs 10s to complete
      const result = calculateOfflineGrowth(tree, 10, whiteOakSpecies);
      expect(result.stage).toBe(1);
      expect(result.progress).toBeCloseTo(0, 6);
    });

    it("stages up multiple times with enough time", () => {
      const tree = makeTree(0, 0);
      // Stage 0: 10s, Stage 1: 15s, Stage 2: 20s => total 45s to reach stage 3
      const result = calculateOfflineGrowth(tree, 45, whiteOakSpecies);
      expect(result.stage).toBe(3);
      expect(result.progress).toBeCloseTo(0, 6);
    });

    it("caps at max stage (4)", () => {
      const tree = makeTree(0, 0);
      // All stages: 10+15+20+25+30 = 100s
      const result = calculateOfflineGrowth(tree, 500, whiteOakSpecies);
      expect(result.stage).toBe(4);
    });

    it("returns max stage unchanged if already at max", () => {
      const tree = makeTree(4, 0.5);
      const result = calculateOfflineGrowth(tree, 1000, whiteOakSpecies);
      expect(result.stage).toBe(4);
      expect(result.progress).toBeLessThanOrEqual(1.0);
    });

    it("handles partial progress correctly", () => {
      const tree = makeTree(0, 0.5);
      // Needs 0.5 more progress at rate 0.1/s = 5s to stage up
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies);
      expect(result.stage).toBe(1);
      expect(result.progress).toBeCloseTo(0, 6);
    });

    it("caps elapsed time at 24 hours (86400 seconds)", () => {
      const tree = makeTree(0, 0);
      // Even with huge elapsed, still uses 86400
      const result = calculateOfflineGrowth(tree, 1000000, whiteOakSpecies);
      expect(result.stage).toBe(4); // more than enough to max out
    });

    it("handles negative elapsed time as 0", () => {
      const tree = makeTree(1, 0.5);
      const result = calculateOfflineGrowth(tree, -100, whiteOakSpecies);
      expect(result.stage).toBe(1);
      expect(result.progress).toBeCloseTo(0.5, 6);
    });

    it("always sets watered to false", () => {
      const tree = makeTree(0, 0);
      tree.watered = true;
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies);
      expect(result.watered).toBe(false);
    });

    it("applies difficulty multiplier (difficulty 5)", () => {
      const tree = makeTree(0, 0);
      // difficulty 5 => mult 2.5; rate = 1.0 / (25 * 2.5) = 0.016/s
      const result = calculateOfflineGrowth(tree, 25, hardSpecies);
      // 25 * 0.016 = 0.4 progress
      expect(result.stage).toBe(0);
      expect(result.progress).toBeCloseTo(0.4, 4);
    });

    it("handles species with zero baseGrowthTime gracefully", () => {
      const badSpecies: OfflineSpeciesData = {
        difficulty: 1,
        baseGrowthTimes: [0, 10, 20, 30, 40],
        evergreen: false,
      };
      const tree = makeTree(0, 0);
      // Should not infinite loop -- rate is 0
      const result = calculateOfflineGrowth(tree, 100, badSpecies);
      expect(result.stage).toBe(0);
    });

    // ── Season multipliers ─────────────────────────────────────────

    it("applies spring season multiplier (1.5x) -- grows faster", () => {
      const tree = makeTree(0, 0);
      // spring mult=1.5: rate = 1.5 / (10 * 1.0) = 0.15/s; 5s => 0.75
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies, 1.5, 1.0);
      expect(result.stage).toBe(0);
      expect(result.progress).toBeCloseTo(0.75, 5);
    });

    it("applies autumn season multiplier (0.8x) -- grows slower", () => {
      const tree = makeTree(0, 0);
      // autumn mult=0.8: rate = 0.8 / (10 * 1.0) = 0.08/s; 5s => 0.4
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies, 0.8, 1.0);
      expect(result.stage).toBe(0);
      expect(result.progress).toBeCloseTo(0.4, 5);
    });

    it("applies winter season multiplier (0.0) -- no growth", () => {
      const tree = makeTree(0, 0.3);
      const result = calculateOfflineGrowth(tree, 100, whiteOakSpecies, 0.0, 1.0);
      expect(result.stage).toBe(0);
      expect(result.progress).toBeCloseTo(0.3, 6);
    });

    // ── Weather multipliers ────────────────────────────────────────

    it("applies rain weather multiplier (1.3x) -- grows faster", () => {
      const tree = makeTree(0, 0);
      // rain mult=1.3: rate = 1.3 / (10 * 1.0) = 0.13/s; 5s => 0.65
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies, 1.0, 1.3);
      expect(result.stage).toBe(0);
      expect(result.progress).toBeCloseTo(0.65, 5);
    });

    it("applies drought weather multiplier (0.5x) -- grows slower", () => {
      const tree = makeTree(0, 0);
      // drought mult=0.5: rate = 0.5 / (10 * 1.0) = 0.05/s; 5s => 0.25
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies, 1.0, 0.5);
      expect(result.stage).toBe(0);
      expect(result.progress).toBeCloseTo(0.25, 5);
    });

    it("combined spring + rain multipliers stack correctly", () => {
      const tree = makeTree(0, 0);
      // spring=1.5, rain=1.3: rate = 1.5*1.3 / (10*1) = 0.195/s; 5s => 0.975
      const result = calculateOfflineGrowth(tree, 5, whiteOakSpecies, 1.5, 1.3);
      expect(result.progress).toBeCloseTo(0.975, 4);
    });
  });

  // ── calculateAllOfflineGrowth ──────────────────────────────────

  describe("calculateAllOfflineGrowth", () => {
    const getSpecies = (id: string) => {
      if (id === "white-oak") return whiteOakSpecies;
      if (id === "hard-tree") return hardSpecies;
      return undefined;
    };

    it("processes multiple trees", () => {
      const trees = [makeTree(0, 0), makeTree(1, 0.5, "white-oak")];
      const results = calculateAllOfflineGrowth(trees, 10, getSpecies);
      expect(results).toHaveLength(2);
      // First tree: stage 0 -> 1 after 10s
      expect(results[0].stage).toBe(1);
      // Second tree: stage 1, progress 0.5, needs 0.5 more at rate 1/15 = 7.5s
      expect(results[1].stage).toBeGreaterThanOrEqual(1);
    });

    it("returns unchanged state for unknown species", () => {
      const trees = [makeTree(2, 0.3, "unknown-tree")];
      const results = calculateAllOfflineGrowth(trees, 100, getSpecies);
      expect(results[0].stage).toBe(2);
      expect(results[0].progress).toBe(0.3);
      expect(results[0].watered).toBe(false);
    });

    it("handles empty tree array", () => {
      const results = calculateAllOfflineGrowth([], 100, getSpecies);
      expect(results).toEqual([]);
    });

    it("handles mix of known and unknown species", () => {
      const trees = [
        makeTree(0, 0, "white-oak"),
        makeTree(1, 0, "nonexistent"),
        makeTree(0, 0, "white-oak"),
      ];
      const results = calculateAllOfflineGrowth(trees, 10, getSpecies);
      expect(results).toHaveLength(3);
      expect(results[0].stage).toBe(1); // grew
      expect(results[1].stage).toBe(1); // unchanged
      expect(results[2].stage).toBe(1); // grew
    });
  });

  // ── applyOfflineGrowthToChunkDeltas ───────────────────────────

  describe("applyOfflineGrowthToChunkDeltas", () => {
    beforeEach(() => {
      clearAllChunkDiffs();
    });

    afterEach(() => {
      clearAllChunkDiffs();
    });

    it("returns zero summary when lastSavedAt is 0 (never saved)", () => {
      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree()] });
      const summary = applyOfflineGrowthToChunkDeltas(0, "spring", "clear", testLookup);
      expect(summary.chunksUpdated).toBe(0);
      expect(summary.treesUpdated).toBe(0);
      expect(summary.stageAdvances).toBe(0);
      expect(summary.elapsedSeconds).toBe(0);
    });

    it("returns zero summary when elapsed time is 0", () => {
      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree()] });
      const now = Date.now();
      const summary = applyOfflineGrowthToChunkDeltas(now, "spring", "clear", testLookup);
      expect(summary.chunksUpdated).toBe(0);
      expect(summary.treesUpdated).toBe(0);
    });

    it("grows trees in chunk deltas over elapsed time", () => {
      // Stage 0, white-oak: rate=0.1/s, need 10s for stage-up
      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });

      const lastSaved = Date.now() - 15_000; // 15 seconds ago
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);

      expect(summary.treesUpdated).toBe(1);
      expect(summary.chunksUpdated).toBe(1);

      const updatedDiff = chunkDiffs$.peek()["0,0"];
      expect(updatedDiff.plantedTrees[0].stage).toBe(1);
    });

    it("records stage advances when tree crosses stage boundary", () => {
      // Enough time for 3 stage-ups: 10+15+20 = 45s
      saveChunkDiff("1,2", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });

      const lastSaved = Date.now() - 50_000; // 50 seconds ago
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);

      expect(summary.stageAdvances).toBeGreaterThanOrEqual(3);
      const updatedDiff = chunkDiffs$.peek()["1,2"];
      expect(updatedDiff.plantedTrees[0].stage).toBeGreaterThanOrEqual(3);
    });

    it("applies season multiplier: spring grows faster than summer", () => {
      const lastSaved = Date.now() - 5_000; // 5s ago

      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });
      applyOfflineGrowthToChunkDeltas(lastSaved, "spring", "clear", testLookup);
      const springProgress = chunkDiffs$.peek()["0,0"].plantedTrees[0].progress;

      clearAllChunkDiffs();
      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });
      applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);
      const summerProgress = chunkDiffs$.peek()["0,0"].plantedTrees[0].progress;

      expect(springProgress).toBeGreaterThan(summerProgress);
    });

    it("winter season (multiplier=0) produces no growth", () => {
      saveChunkDiff("0,0", {
        plantedTrees: [makePlantedTree({ stage: 0, progress: 0.3 })],
      });

      const lastSaved = Date.now() - 60_000;
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "winter", "clear", testLookup);

      expect(summary.treesUpdated).toBe(0);
      expect(summary.chunksUpdated).toBe(0);
      // Winter short-circuits before touching diffs
      const diff = chunkDiffs$.peek()["0,0"];
      expect(diff.plantedTrees[0].progress).toBeCloseTo(0.3, 6);
    });

    it("applies weather multiplier: rain grows faster than clear", () => {
      const lastSaved = Date.now() - 5_000;

      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });
      applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "rain", testLookup);
      const rainProgress = chunkDiffs$.peek()["0,0"].plantedTrees[0].progress;

      clearAllChunkDiffs();
      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });
      applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);
      const clearProgress = chunkDiffs$.peek()["0,0"].plantedTrees[0].progress;

      expect(rainProgress).toBeGreaterThan(clearProgress);
    });

    it("handles multiple chunks independently", () => {
      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });
      saveChunkDiff("1,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });
      saveChunkDiff("2,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });

      const lastSaved = Date.now() - 15_000;
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);

      expect(summary.chunksUpdated).toBe(3);
      expect(summary.treesUpdated).toBe(3);
    });

    it("skips trees with unknown species (leaves them unchanged)", () => {
      saveChunkDiff("0,0", {
        plantedTrees: [makePlantedTree({ speciesId: "unknown-species", stage: 0, progress: 0.2 })],
      });

      const lastSaved = Date.now() - 30_000;
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);

      expect(summary.treesUpdated).toBe(0);
      expect(summary.chunksUpdated).toBe(0);
    });

    it("caps elapsed time at 24 hours (86400s)", () => {
      saveChunkDiff("0,0", { plantedTrees: [makePlantedTree({ stage: 0, progress: 0 })] });

      // 48 hours ago
      const lastSaved = Date.now() - 48 * 60 * 60 * 1000;
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);

      expect(summary.elapsedSeconds).toBe(86400);
      // Tree should be at max stage (all stages need 100s total, 86400s >> 100s)
      expect(chunkDiffs$.peek()["0,0"].plantedTrees[0].stage).toBe(4);
    });

    it("does not mutate chunks with trees already at max stage", () => {
      saveChunkDiff("0,0", {
        plantedTrees: [makePlantedTree({ stage: 4, progress: 1.0 })],
      });

      const originalDiff = chunkDiffs$.peek()["0,0"];
      const lastSaved = Date.now() - 30_000;
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);

      expect(summary.chunksUpdated).toBe(0);
      expect(summary.treesUpdated).toBe(0);
      // Diff reference unchanged
      expect(chunkDiffs$.peek()["0,0"]).toBe(originalDiff);
    });

    it("returns elapsedSeconds within expected range", () => {
      const lastSaved = Date.now() - 10_000;
      const summary = applyOfflineGrowthToChunkDeltas(lastSaved, "summer", "clear", testLookup);
      expect(summary.elapsedSeconds).toBeGreaterThanOrEqual(9);
      expect(summary.elapsedSeconds).toBeLessThanOrEqual(11);
    });
  });
});
