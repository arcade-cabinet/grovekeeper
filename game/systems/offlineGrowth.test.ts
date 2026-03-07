import {
  calculateAllOfflineGrowth,
  calculateOfflineGrowth,
  type OfflineSpeciesData,
  type OfflineTreeState,
} from "@/game/systems/offlineGrowth";

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
});
