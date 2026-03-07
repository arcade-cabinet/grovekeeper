/**
 * Dialogue branch selection tests (Spec §33.2).
 *
 * Covers:
 * - normalizeSeedBias: empty, single, equal, weighted, all-zero
 * - selectDefaultBranch: empty, single, valid index, determinism, diversity
 * - selectDefaultBranchNode: returns branch object
 * - Same seed always selects same branch
 * - Heavily-weighted branch wins more often across node indices
 */

import {
  normalizeSeedBias,
  selectDefaultBranch,
  selectDefaultBranchNode,
  evaluateCondition,
  filterAvailableBranches,
} from "./dialogueBranch";
import type {
  DialogueBranch,
  DialogueContext,
} from "@/game/ecs/components/dialogue";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBranch(
  label: string,
  targetNodeId: string,
  seedBias: number,
): DialogueBranch {
  return { label, targetNodeId, seedBias };
}

// ---------------------------------------------------------------------------
// normalizeSeedBias
// ---------------------------------------------------------------------------

describe("normalizeSeedBias (Spec §33.2)", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeSeedBias([])).toEqual([]);
  });

  it("normalizes a single branch to weight 1.0", () => {
    const weights = normalizeSeedBias([makeBranch("A", "n1", 0.8)]);
    expect(weights).toHaveLength(1);
    expect(weights[0]).toBeCloseTo(1.0);
  });

  it("normalizes equal weights to uniform distribution", () => {
    const branches = [makeBranch("A", "n1", 1.0), makeBranch("B", "n2", 1.0)];
    const weights = normalizeSeedBias(branches);
    expect(weights[0]).toBeCloseTo(0.5);
    expect(weights[1]).toBeCloseTo(0.5);
  });

  it("normalizes unequal weights proportionally", () => {
    const branches = [makeBranch("A", "n1", 3.0), makeBranch("B", "n2", 1.0)];
    const weights = normalizeSeedBias(branches);
    expect(weights[0]).toBeCloseTo(0.75);
    expect(weights[1]).toBeCloseTo(0.25);
  });

  it("normalized weights always sum to 1.0", () => {
    const branches = [
      makeBranch("A", "n1", 0.2),
      makeBranch("B", "n2", 0.5),
      makeBranch("C", "n3", 0.3),
    ];
    const sum = normalizeSeedBias(branches).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it("treats all-zero seedBias as uniform distribution", () => {
    const branches = [
      makeBranch("A", "n1", 0),
      makeBranch("B", "n2", 0),
      makeBranch("C", "n3", 0),
    ];
    const weights = normalizeSeedBias(branches);
    expect(weights[0]).toBeCloseTo(1 / 3);
    expect(weights[1]).toBeCloseTo(1 / 3);
    expect(weights[2]).toBeCloseTo(1 / 3);
  });
});

// ---------------------------------------------------------------------------
// selectDefaultBranch
// ---------------------------------------------------------------------------

describe("selectDefaultBranch (Spec §33.2)", () => {
  const WORLD_SEED = "Gentle Mossy Hollow";
  const ENTITY_ID = "rowan-1";

  it("returns -1 for empty branches", () => {
    expect(selectDefaultBranch([], WORLD_SEED, ENTITY_ID, 0)).toBe(-1);
  });

  it("returns 0 for a single branch without calling RNG", () => {
    const branches = [makeBranch("Only", "n1", 1.0)];
    expect(selectDefaultBranch(branches, WORLD_SEED, ENTITY_ID, 0)).toBe(0);
  });

  it("returns a valid index within [0, branches.length)", () => {
    const branches = [
      makeBranch("A", "n1", 0.5),
      makeBranch("B", "n2", 0.3),
      makeBranch("C", "n3", 0.2),
    ];
    const idx = selectDefaultBranch(branches, WORLD_SEED, ENTITY_ID, 0);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(branches.length);
  });

  it("same seed + entityId + nodeIndex always returns the same index", () => {
    const branches = [
      makeBranch("A", "n1", 0.5),
      makeBranch("B", "n2", 0.3),
      makeBranch("C", "n3", 0.2),
    ];
    const idx1 = selectDefaultBranch(branches, WORLD_SEED, ENTITY_ID, 2);
    const idx2 = selectDefaultBranch(branches, WORLD_SEED, ENTITY_ID, 2);
    expect(idx1).toBe(idx2);
  });

  it("different nodeIndex values produce variation across many samples", () => {
    const branches = [makeBranch("A", "n1", 0.5), makeBranch("B", "n2", 0.5)];
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      seen.add(selectDefaultBranch(branches, WORLD_SEED, ENTITY_ID, i));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("different worldSeeds produce different selections over many nodes", () => {
    const branches = [makeBranch("A", "n1", 0.5), makeBranch("B", "n2", 0.5)];
    const resultsA: number[] = [];
    const resultsB: number[] = [];
    for (let i = 0; i < 20; i++) {
      resultsA.push(selectDefaultBranch(branches, "seed-alpha", ENTITY_ID, i));
      resultsB.push(selectDefaultBranch(branches, "seed-beta", ENTITY_ID, i));
    }
    // Different seeds should produce different sequences
    expect(resultsA.join(",")).not.toBe(resultsB.join(","));
  });

  it("a heavily-weighted branch wins more often across node indices", () => {
    // Branch 0 has 90% weight, branch 1 has 10%
    const branches = [
      makeBranch("Heavy", "n1", 9.0),
      makeBranch("Light", "n2", 1.0),
    ];
    let heavyCount = 0;
    for (let i = 0; i < 100; i++) {
      if (selectDefaultBranch(branches, WORLD_SEED, ENTITY_ID, i) === 0) {
        heavyCount++;
      }
    }
    // With 90% weight expect at least 70 of 100 to select Heavy
    expect(heavyCount).toBeGreaterThan(70);
  });

  it("different entityId with same seed + nodeIndex produces independent streams", () => {
    const branches = [makeBranch("A", "n1", 0.5), makeBranch("B", "n2", 0.5)];
    const resultsE1: number[] = [];
    const resultsE2: number[] = [];
    for (let i = 0; i < 20; i++) {
      resultsE1.push(selectDefaultBranch(branches, WORLD_SEED, "entity-1", i));
      resultsE2.push(selectDefaultBranch(branches, WORLD_SEED, "entity-2", i));
    }
    // Different entityIds should produce different streams
    expect(resultsE1.join(",")).not.toBe(resultsE2.join(","));
  });
});

// ---------------------------------------------------------------------------
// selectDefaultBranchNode
// ---------------------------------------------------------------------------

describe("selectDefaultBranchNode (Spec §33.2)", () => {
  const WORLD_SEED = "Gentle Mossy Hollow";
  const ENTITY_ID = "spirit-1";

  it("returns undefined for empty branches", () => {
    expect(
      selectDefaultBranchNode([], WORLD_SEED, ENTITY_ID, 0),
    ).toBeUndefined();
  });

  it("returns the branch object for a single-branch node", () => {
    const branches = [makeBranch("Continue", "node-b", 1.0)];
    const result = selectDefaultBranchNode(branches, WORLD_SEED, ENTITY_ID, 0);
    expect(result).toBeDefined();
    expect(result!.label).toBe("Continue");
    expect(result!.targetNodeId).toBe("node-b");
  });

  it("returned branch is one of the input branch objects", () => {
    const branches = [
      makeBranch("A", "n1", 0.5),
      makeBranch("B", "n2", 0.5),
    ];
    const result = selectDefaultBranchNode(branches, WORLD_SEED, ENTITY_ID, 3);
    expect(branches).toContain(result);
  });

  it("returns same branch object on repeated calls with same inputs", () => {
    const branches = [
      makeBranch("A", "n1", 0.4),
      makeBranch("B", "n2", 0.6),
    ];
    const r1 = selectDefaultBranchNode(branches, WORLD_SEED, ENTITY_ID, 5);
    const r2 = selectDefaultBranchNode(branches, WORLD_SEED, ENTITY_ID, 5);
    expect(r1).toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// Helpers for condition gating tests
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<DialogueContext> = {}): DialogueContext {
  return {
    playerLevel: 1,
    inventory: [],
    completedQuests: [],
    discoveredLocations: [],
    discoveredSpirits: [],
    currentSeason: "spring",
    timeOfDay: "morning",
    npcRelationships: {},
    ...overrides,
  };
}

function makeBranchWithConditions(
  label: string,
  conditions: DialogueBranch["conditions"],
): DialogueBranch {
  return { label, targetNodeId: "next", seedBias: 1.0, conditions };
}

// ---------------------------------------------------------------------------
// evaluateCondition (Spec §33.4)
// ---------------------------------------------------------------------------

describe("evaluateCondition — has_item (Spec §33.4)", () => {
  it("passes when player has the required item", () => {
    const ctx = makeContext({ inventory: ["golden-seed", "axe"] });
    expect(
      evaluateCondition({ type: "has_item", value: "golden-seed" }, ctx),
    ).toBe(true);
  });

  it("fails when player does not have the required item", () => {
    const ctx = makeContext({ inventory: [] });
    expect(
      evaluateCondition({ type: "has_item", value: "golden-seed" }, ctx),
    ).toBe(false);
  });

  it("negation inverts has_item — true when item is absent", () => {
    const ctx = makeContext({ inventory: [] });
    expect(
      evaluateCondition(
        { type: "has_item", value: "golden-seed", negate: true },
        ctx,
      ),
    ).toBe(true);
  });
});

describe("evaluateCondition — has_level (Spec §33.4)", () => {
  it("passes when playerLevel meets the required level", () => {
    const ctx = makeContext({ playerLevel: 5 });
    expect(evaluateCondition({ type: "has_level", value: 5 }, ctx)).toBe(true);
  });

  it("passes when playerLevel exceeds the required level", () => {
    const ctx = makeContext({ playerLevel: 10 });
    expect(evaluateCondition({ type: "has_level", value: 5 }, ctx)).toBe(true);
  });

  it("fails when playerLevel is below the required level", () => {
    const ctx = makeContext({ playerLevel: 2 });
    expect(evaluateCondition({ type: "has_level", value: 5 }, ctx)).toBe(false);
  });

  it("negation inverts has_level — true when level is insufficient", () => {
    const ctx = makeContext({ playerLevel: 2 });
    expect(
      evaluateCondition({ type: "has_level", value: 5, negate: true }, ctx),
    ).toBe(true);
  });
});

describe("evaluateCondition — quest_complete (Spec §33.4)", () => {
  it("passes when the quest is completed", () => {
    const ctx = makeContext({ completedQuests: ["find-rowan", "clear-maze"] });
    expect(
      evaluateCondition({ type: "quest_complete", value: "find-rowan" }, ctx),
    ).toBe(true);
  });

  it("fails when the quest is not completed", () => {
    const ctx = makeContext({ completedQuests: [] });
    expect(
      evaluateCondition({ type: "quest_complete", value: "find-rowan" }, ctx),
    ).toBe(false);
  });
});

describe("evaluateCondition — season (Spec §33.4)", () => {
  it("passes when current season matches", () => {
    const ctx = makeContext({ currentSeason: "winter" });
    expect(
      evaluateCondition({ type: "season", value: "winter" }, ctx),
    ).toBe(true);
  });

  it("fails when current season does not match", () => {
    const ctx = makeContext({ currentSeason: "summer" });
    expect(
      evaluateCondition({ type: "season", value: "winter" }, ctx),
    ).toBe(false);
  });
});

describe("evaluateCondition — spirit_discovered (Spec §33.4)", () => {
  it("passes when the spirit has been discovered", () => {
    const ctx = makeContext({ discoveredSpirits: ["spirit-moss", "spirit-flame"] });
    expect(
      evaluateCondition({ type: "spirit_discovered", value: "spirit-moss" }, ctx),
    ).toBe(true);
  });

  it("fails when the spirit has not been discovered", () => {
    const ctx = makeContext({ discoveredSpirits: [] });
    expect(
      evaluateCondition({ type: "spirit_discovered", value: "spirit-moss" }, ctx),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterAvailableBranches (Spec §33.4)
// ---------------------------------------------------------------------------

describe("filterAvailableBranches (Spec §33.4)", () => {
  it("returns all branches when none have conditions", () => {
    const branches = [
      makeBranch("A", "n1", 1.0),
      makeBranch("B", "n2", 1.0),
    ];
    const ctx = makeContext();
    expect(filterAvailableBranches(branches, ctx)).toHaveLength(2);
  });

  it("removes a branch whose condition is not satisfied", () => {
    const branches = [
      makeBranchWithConditions("Gated", [{ type: "has_level", value: 10 }]),
      makeBranch("Open", "n2", 1.0),
    ];
    const ctx = makeContext({ playerLevel: 1 });
    const available = filterAvailableBranches(branches, ctx);
    expect(available).toHaveLength(1);
    expect(available[0].label).toBe("Open");
  });

  it("keeps a branch whose condition is satisfied", () => {
    const branches = [
      makeBranchWithConditions("Unlocked", [{ type: "has_item", value: "oak-seed" }]),
    ];
    const ctx = makeContext({ inventory: ["oak-seed"] });
    const available = filterAvailableBranches(branches, ctx);
    expect(available).toHaveLength(1);
    expect(available[0].label).toBe("Unlocked");
  });

  it("requires ALL conditions to pass (AND semantics)", () => {
    const branches = [
      makeBranchWithConditions("Both", [
        { type: "has_level", value: 5 },
        { type: "has_item", value: "torch" },
      ]),
    ];
    // Level ok, item missing
    const ctx = makeContext({ playerLevel: 5, inventory: [] });
    expect(filterAvailableBranches(branches, ctx)).toHaveLength(0);
  });

  it("returns empty array when all branches are gated", () => {
    const branches = [
      makeBranchWithConditions("A", [{ type: "quest_complete", value: "q1" }]),
      makeBranchWithConditions("B", [{ type: "quest_complete", value: "q2" }]),
    ];
    const ctx = makeContext({ completedQuests: [] });
    expect(filterAvailableBranches(branches, ctx)).toHaveLength(0);
  });

  it("negated condition gates branch correctly", () => {
    // Branch available only when player does NOT have the item
    const branches = [
      makeBranchWithConditions("Newcomer", [
        { type: "has_item", value: "veteran-badge", negate: true },
      ]),
    ];
    const noviceCtx = makeContext({ inventory: [] });
    const vetCtx = makeContext({ inventory: ["veteran-badge"] });
    expect(filterAvailableBranches(branches, noviceCtx)).toHaveLength(1);
    expect(filterAvailableBranches(branches, vetCtx)).toHaveLength(0);
  });
});
