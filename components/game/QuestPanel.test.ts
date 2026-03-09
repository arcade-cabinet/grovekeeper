/**
 * Tests for QuestPanel data types, display logic, and ECS mapping.
 * Spec §14.4 — NPC Quest Chains.
 *
 * mapQuestBranchToDisplay is a pure function in QuestPanel.tsx but the
 * module also imports React Native UI components. Mocks below prevent
 * @rn-primitives/slot JSX parse errors and isolate the pure function.
 */

// ── Mocks (must precede all imports) ─────────────────────────────────────────

jest.mock("@/components/ui/text", () => ({ Text: "Text" }));
jest.mock("@/game/ecs/world", () => ({ questBranchQuery: [] }));
jest.mock("@/game/stores", () => ({
  useGameStore: jest.fn().mockReturnValue({}),
}));
jest.mock("./Toast", () => ({ showToast: jest.fn() }));

// ── Imports ───────────────────────────────────────────────────────────────────

import type { QuestBranchComponent } from "@/game/ecs/components/dialogue";
import {
  advanceObjectives,
  initializeChainState,
  startChain,
} from "@/game/quests/questChainEngine";
import type { QuestChainState } from "@/game/quests/types";
import {
  type ActiveQuestDisplay,
  mapQuestBranchToDisplay,
  type QuestObjectiveDisplay,
} from "./QuestPanel.tsx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuestBranch(overrides: Partial<QuestBranchComponent> = {}): QuestBranchComponent {
  return {
    questChainId: "test-chain",
    branchPath: [],
    currentStep: 0,
    totalSteps: 3,
    status: "active",
    currentObjective: "Do something",
    rewardTier: 1,
    ...overrides,
  };
}

function makeEntity(qb: QuestBranchComponent): { questBranch: QuestBranchComponent } {
  return { questBranch: qb };
}

// ---------------------------------------------------------------------------
// Type tests (Spec §14)
// ---------------------------------------------------------------------------

describe("QuestPanel types", () => {
  it("accepts a valid quest display object", () => {
    const objective: QuestObjectiveDisplay = {
      description: "Plant 5 trees",
      current: 3,
      target: 5,
      completed: false,
    };

    const quest: ActiveQuestDisplay = {
      chainId: "rowan-chain",
      chainName: "Elder Rowan's Tasks",
      icon: "Q",
      currentStep: {
        name: "Plant the Grove",
        objectives: [objective],
        completed: false,
        rewardClaimed: false,
      },
      totalSteps: 3,
      currentStepIndex: 0,
    };

    expect(quest.chainId).toBe("rowan-chain");
    expect(quest.currentStep?.objectives[0].current).toBe(3);
    expect(quest.currentStep?.objectives[0].target).toBe(5);
  });

  it("handles quest with no current step", () => {
    const quest: ActiveQuestDisplay = {
      chainId: "completed-chain",
      chainName: "Done Quest",
      icon: "C",
      currentStep: null,
      totalSteps: 2,
      currentStepIndex: 2,
    };

    expect(quest.currentStep).toBeNull();
  });

  it("tracks objective completion", () => {
    const obj: QuestObjectiveDisplay = {
      description: "Water 10 trees",
      current: 10,
      target: 10,
      completed: true,
    };

    expect(obj.completed).toBe(true);
    expect(obj.current >= obj.target).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mapQuestBranchToDisplay (Spec §14.4)
// ---------------------------------------------------------------------------

describe("mapQuestBranchToDisplay (Spec §14.4)", () => {
  const emptyChainState: QuestChainState = initializeChainState();

  it("returns empty array for empty branches", () => {
    expect(mapQuestBranchToDisplay([], emptyChainState)).toEqual([]);
  });

  it("filters out non-active quests", () => {
    const branches = [
      makeEntity(makeQuestBranch({ status: "available" })),
      makeEntity(makeQuestBranch({ status: "completed" })),
      makeEntity(makeQuestBranch({ status: "failed" })),
    ];
    expect(mapQuestBranchToDisplay(branches, emptyChainState)).toHaveLength(0);
  });

  it("includes only active quests", () => {
    const branches = [
      makeEntity(makeQuestBranch({ status: "active", questChainId: "chain-a" })),
      makeEntity(makeQuestBranch({ status: "available", questChainId: "chain-b" })),
      makeEntity(makeQuestBranch({ status: "active", questChainId: "chain-c" })),
    ];
    const result = mapQuestBranchToDisplay(branches, emptyChainState);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.chainId)).toEqual(["chain-a", "chain-c"]);
  });

  it("falls back to ECS currentObjective when no chain state", () => {
    const branches = [
      makeEntity(
        makeQuestBranch({
          status: "active",
          questChainId: "unknown-chain",
          currentObjective: "Collect 5 mushrooms",
        }),
      ),
    ];
    const result = mapQuestBranchToDisplay(branches, emptyChainState);
    expect(result).toHaveLength(1);
    expect(result[0].currentStep?.name).toBe("Collect 5 mushrooms");
    expect(result[0].currentStep?.objectives[0].description).toBe("Collect 5 mushrooms");
    expect(result[0].currentStep?.objectives[0].target).toBe(1);
    expect(result[0].currentStep?.objectives[0].current).toBe(0);
  });

  it("uses questChainId as chainName fallback when chain def not found", () => {
    const qb = makeQuestBranch({ status: "active", questChainId: "no-such-chain" });
    const result = mapQuestBranchToDisplay([makeEntity(qb)], emptyChainState);
    expect(result[0].chainName).toBe("no-such-chain");
    expect(result[0].icon).toBe("📜");
  });

  it("preserves currentStepIndex and totalSteps from ECS when no chain def", () => {
    const qb = makeQuestBranch({
      status: "active",
      questChainId: "ghost-chain",
      currentStep: 2,
      totalSteps: 5,
    });
    const result = mapQuestBranchToDisplay([makeEntity(qb)], emptyChainState);
    expect(result[0].currentStepIndex).toBe(2);
    expect(result[0].totalSteps).toBe(5);
  });

  it("returns null currentStep when active but currentObjective is empty and no chain state", () => {
    const qb = makeQuestBranch({
      status: "active",
      questChainId: "bare-chain",
      currentObjective: "",
    });
    const result = mapQuestBranchToDisplay([makeEntity(qb)], emptyChainState);
    expect(result[0].currentStep).toBeNull();
  });

  it("maps objectives from questChainState when chain and step are known", () => {
    // Use main-quest-spirits: 1 step, objective targetAmount=8
    let chainState = initializeChainState();
    chainState = startChain(chainState, "main-quest-spirits", 1);
    const { state: advanced } = advanceObjectives(chainState, "spirit_discovered", 3);

    const qb = makeQuestBranch({
      status: "active",
      questChainId: "main-quest-spirits",
      currentStep: 0,
    });
    const result = mapQuestBranchToDisplay([makeEntity(qb)], advanced);
    expect(result).toHaveLength(1);

    const step = result[0].currentStep;
    expect(step).not.toBeNull();
    expect(step?.objectives[0].current).toBe(3);
    expect(step?.objectives[0].target).toBe(8);
    expect(step?.objectives[0].completed).toBe(false);
    expect(step?.completed).toBe(false);
  });

  it("marks step completed when all objectives done in chain state", () => {
    let chainState = initializeChainState();
    chainState = startChain(chainState, "main-quest-spirits", 1);
    const { state: done } = advanceObjectives(chainState, "spirit_discovered", 8);

    const qb = makeQuestBranch({
      status: "active",
      questChainId: "main-quest-spirits",
      currentStep: 0,
    });
    const result = mapQuestBranchToDisplay([makeEntity(qb)], done);
    expect(result[0].currentStep?.completed).toBe(true);
    expect(result[0].currentStep?.objectives[0].completed).toBe(true);
  });

  it("uses chain def name and icon when chain exists", () => {
    let chainState = initializeChainState();
    chainState = startChain(chainState, "rowan-history", 1);

    const qb = makeQuestBranch({
      status: "active",
      questChainId: "rowan-history",
    });
    const result = mapQuestBranchToDisplay([makeEntity(qb)], chainState);
    expect(result[0].chainName).toBe("Roots of the Past");
    expect(result[0].icon).toBe("📜");
  });
});
