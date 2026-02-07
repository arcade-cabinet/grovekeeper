import { describe, it, expect } from "vitest";
import {
  calculateOfflineGrowth,
  calculateAllOfflineGrowth,
  type OfflineTreeState,
  type OfflineSpeciesData,
} from "./offlineGrowth";

/**
 * Helper: create a simple species with uniform base growth times and
 * difficulty 1 (multiplier 1.0).
 */
function makeSpecies(
  overrides: Partial<OfflineSpeciesData> = {},
): OfflineSpeciesData {
  return {
    difficulty: 1,
    baseGrowthTimes: [10, 10, 10, 10, 10],
    evergreen: false,
    ...overrides,
  };
}

function makeTree(overrides: Partial<OfflineTreeState> = {}): OfflineTreeState {
  return {
    speciesId: "test-tree",
    stage: 0,
    progress: 0,
    watered: false,
    ...overrides,
  };
}

describe("calculateOfflineGrowth", () => {
  it("advances a seed to stage 1 with partial progress given 15s elapsed", () => {
    // Stage 0 baseGrowthTime = 10s, difficulty 1 (mult 1.0)
    // rate = 1/10 = 0.1 per second
    // After 10s: stage 0 -> 1, progress resets to 0, 5s remain
    // 5s at stage 1 (also 10s base): progress = 0.1 * 5 = 0.5
    const tree = makeTree({ stage: 0, progress: 0 });
    const species = makeSpecies({ baseGrowthTimes: [10, 10, 10, 10, 10] });

    const result = calculateOfflineGrowth(tree, 15, species);

    expect(result.stage).toBe(1);
    expect(result.progress).toBeCloseTo(0.5);
  });

  it("advances through multiple stages when enough time elapses", () => {
    // 10s per stage, difficulty 1 => 10s to complete each stage
    // Total for stages 0-3: 4 * 10s = 40s -> stage 4 at progress 0
    // With 50s: 40s to reach stage 4, 10s remaining but at max stage
    const tree = makeTree({ stage: 0, progress: 0 });
    const species = makeSpecies({ baseGrowthTimes: [10, 10, 10, 10, 10] });

    const result = calculateOfflineGrowth(tree, 50, species);

    expect(result.stage).toBe(4);
    // At max stage, remaining 10s would give progress = 1.0, capped at 1.0
    expect(result.progress).toBeLessThanOrEqual(1.0);
  });

  it("does not advance past max stage (4)", () => {
    const tree = makeTree({ stage: 4, progress: 0.5 });
    const species = makeSpecies();

    const result = calculateOfflineGrowth(tree, 10000, species);

    expect(result.stage).toBe(4);
    expect(result.progress).toBeLessThanOrEqual(1.0);
  });

  it("caps offline time at 24 hours (86400 seconds)", () => {
    // With very long base growth times, we can verify the cap
    // baseGrowthTime = 1000s per stage, difficulty 1
    // rate = 0.001/s, in 86400s: progress = 86.4 (fills many stages)
    // in 200000s uncapped: would fill more stages
    const tree = makeTree({ stage: 0, progress: 0 });
    const species = makeSpecies({
      baseGrowthTimes: [1000, 1000, 1000, 1000, 1000],
    });

    const capped = calculateOfflineGrowth(tree, 200000, species);
    const exact = calculateOfflineGrowth(tree, 86400, species);

    expect(capped.stage).toBe(exact.stage);
    expect(capped.progress).toBeCloseTo(exact.progress);
  });

  it("always returns watered = false", () => {
    const tree = makeTree({ watered: true, stage: 1, progress: 0.3 });
    const species = makeSpecies();

    const result = calculateOfflineGrowth(tree, 5, species);

    expect(result.watered).toBe(false);
  });

  it("slows growth with higher difficulty multiplier", () => {
    // Difficulty 1 => multiplier 1.0, Difficulty 2 => multiplier 1.3
    // Stage 0, baseGrowthTime 10s
    // Diff 1 rate = 1/(10*1.0) = 0.1/s => 5s gives progress 0.5
    // Diff 2 rate = 1/(10*1.3) ~= 0.0769/s => 5s gives progress ~0.3846
    const tree = makeTree({ stage: 0, progress: 0 });
    const easy = makeSpecies({ difficulty: 1 });
    const medium = makeSpecies({ difficulty: 2 });

    const easyResult = calculateOfflineGrowth(tree, 5, easy);
    const mediumResult = calculateOfflineGrowth(tree, 5, medium);

    expect(easyResult.progress).toBeCloseTo(0.5);
    expect(mediumResult.progress).toBeCloseTo(1 / (10 * 1.3) * 5); // ~0.3846
    expect(easyResult.progress).toBeGreaterThan(mediumResult.progress);
  });

  it("handles tree already partway through a stage", () => {
    // Stage 1 at 0.5 progress, baseGrowthTime 10s, difficulty 1
    // rate = 0.1/s, need 0.5 more progress = 5s to complete stage 1
    // With 7s: 5s to finish stage 1, 2s into stage 2 => progress = 0.2
    const tree = makeTree({ stage: 1, progress: 0.5 });
    const species = makeSpecies();

    const result = calculateOfflineGrowth(tree, 7, species);

    expect(result.stage).toBe(2);
    expect(result.progress).toBeCloseTo(0.2);
  });

  it("handles zero elapsed seconds (no change)", () => {
    const tree = makeTree({ stage: 2, progress: 0.3 });
    const species = makeSpecies();

    const result = calculateOfflineGrowth(tree, 0, species);

    expect(result.stage).toBe(2);
    expect(result.progress).toBeCloseTo(0.3);
    expect(result.watered).toBe(false);
  });

  it("handles negative elapsed seconds gracefully", () => {
    const tree = makeTree({ stage: 1, progress: 0.5 });
    const species = makeSpecies();

    const result = calculateOfflineGrowth(tree, -100, species);

    expect(result.stage).toBe(1);
    expect(result.progress).toBeCloseTo(0.5);
  });

  it("works with varying base growth times per stage", () => {
    // Stage 0: 5s, Stage 1: 20s, Stage 2: 10s
    // Difficulty 1, rate_0 = 0.2/s, rate_1 = 0.05/s, rate_2 = 0.1/s
    // After 5s: finish stage 0, 0s remain
    const tree = makeTree({ stage: 0, progress: 0 });
    const species = makeSpecies({
      baseGrowthTimes: [5, 20, 10, 30, 40],
    });

    // Exactly 5s to finish stage 0
    const result1 = calculateOfflineGrowth(tree, 5, species);
    expect(result1.stage).toBe(1);
    expect(result1.progress).toBeCloseTo(0);

    // 5s for stage 0 + 10s into stage 1 (rate = 0.05/s => progress = 0.5)
    const result2 = calculateOfflineGrowth(tree, 15, species);
    expect(result2.stage).toBe(1);
    expect(result2.progress).toBeCloseTo(0.5);
  });

  it("handles difficulty 5 (multiplier 2.5)", () => {
    // baseGrowthTime 10s, difficulty 5 => mult 2.5
    // rate = 1/(10*2.5) = 0.04/s
    // 10s => progress = 0.4
    const tree = makeTree({ stage: 0, progress: 0 });
    const species = makeSpecies({ difficulty: 5 });

    const result = calculateOfflineGrowth(tree, 10, species);

    expect(result.stage).toBe(0);
    expect(result.progress).toBeCloseTo(0.4);
  });

  it("fills exactly to stage boundary without floating point drift", () => {
    // 10s base, difficulty 1, rate = 0.1/s
    // 10s exactly should advance from stage 0 to stage 1 at progress 0
    const tree = makeTree({ stage: 0, progress: 0 });
    const species = makeSpecies({ baseGrowthTimes: [10, 10, 10, 10, 10] });

    const result = calculateOfflineGrowth(tree, 10, species);

    expect(result.stage).toBe(1);
    expect(result.progress).toBeCloseTo(0, 5);
  });
});

describe("calculateAllOfflineGrowth", () => {
  const speciesMap: Record<string, OfflineSpeciesData> = {
    "white-oak": {
      difficulty: 1,
      baseGrowthTimes: [10, 15, 20, 25, 30],
      evergreen: false,
    },
    "elder-pine": {
      difficulty: 2,
      baseGrowthTimes: [12, 16, 22, 28, 35],
      evergreen: true,
    },
  };

  const getSpecies = (id: string) => speciesMap[id];

  it("processes multiple trees and returns results in order", () => {
    const trees: OfflineTreeState[] = [
      { speciesId: "white-oak", stage: 0, progress: 0, watered: false },
      { speciesId: "elder-pine", stage: 2, progress: 0.5, watered: true },
    ];

    const results = calculateAllOfflineGrowth(trees, 20, getSpecies);

    expect(results).toHaveLength(2);

    // First tree: white-oak, stage 0, 10s base, diff 1
    // rate = 0.1/s, 10s => stage 1, 10s remain at stage 1 (15s base)
    // rate_1 = 1/15 ~= 0.0667/s, 10s => progress ~= 0.667
    expect(results[0].stage).toBe(1);
    expect(results[0].progress).toBeCloseTo(10 / 15);
    expect(results[0].watered).toBe(false);

    // Second tree: elder-pine, stage 2, 0.5 progress, diff 2 (mult 1.3)
    // rate = 1/(22*1.3) ~= 0.03497/s
    // need 0.5 more progress => 0.5/0.03497 ~= 14.3s
    // 20s available: 14.3s to finish stage 2, 5.7s into stage 3
    // stage 3 rate = 1/(28*1.3) ~= 0.02747/s => progress = 5.7 * 0.02747 ~= 0.1566
    expect(results[1].stage).toBe(3);
    expect(results[1].watered).toBe(false);
  });

  it("returns unchanged state for unknown species", () => {
    const trees: OfflineTreeState[] = [
      { speciesId: "unknown-tree", stage: 1, progress: 0.3, watered: true },
    ];

    const results = calculateAllOfflineGrowth(trees, 1000, getSpecies);

    expect(results).toHaveLength(1);
    expect(results[0].stage).toBe(1);
    expect(results[0].progress).toBeCloseTo(0.3);
    expect(results[0].watered).toBe(false);
  });

  it("handles an empty tree array", () => {
    const results = calculateAllOfflineGrowth([], 1000, getSpecies);
    expect(results).toHaveLength(0);
  });
});
