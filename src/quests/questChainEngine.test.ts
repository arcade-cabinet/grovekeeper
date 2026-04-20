import { describe, expect, it } from "vitest";
import {
  advanceObjectives,
  claimStepReward,
  computeAvailableChains,
  getActiveChainIds,
  getAllChainDefs,
  getChainDef,
  getChainTotalSteps,
  getCurrentStep,
  getCurrentStepProgress,
  initializeChainState,
  isChainActive,
  isChainCompleted,
  startChain,
} from "./questChainEngine";

describe("Quest Chain Engine", () => {
  describe("data loading", () => {
    it("loads all quest chain definitions", () => {
      const chains = getAllChainDefs();
      expect(chains.length).toBe(8);
    });

    it("retrieves a chain by ID", () => {
      const chain = getChainDef("rowan-history");
      expect(chain).toBeDefined();
      expect(chain!.name).toBe("Roots of the Past");
      expect(chain!.npcId).toBe("elder-rowan");
    });

    it("returns undefined for unknown chain ID", () => {
      expect(getChainDef("nonexistent")).toBeUndefined();
    });

    it("each chain has at least one step", () => {
      for (const chain of getAllChainDefs()) {
        expect(chain.steps.length).toBeGreaterThan(0);
      }
    });

    it("each step has at least one objective", () => {
      for (const chain of getAllChainDefs()) {
        for (const step of chain.steps) {
          expect(step.objectives.length).toBeGreaterThan(0);
        }
      }
    });

    it("chain categories are valid", () => {
      const validCategories = ["npc", "main_story", "seasonal"];
      for (const chain of getAllChainDefs()) {
        expect(validCategories).toContain(chain.category);
      }
    });

    it("main story chain has prerequisiteChainIds", () => {
      const mainStory = getChainDef("dying-forest");
      expect(mainStory).toBeDefined();
      expect(mainStory!.prerequisiteChainIds).toContain("rowan-history");
    });
  });

  describe("initializeChainState", () => {
    it("creates empty state", () => {
      const state = initializeChainState();
      expect(Object.keys(state.activeChains)).toHaveLength(0);
      expect(state.completedChainIds).toHaveLength(0);
      expect(state.availableChainIds).toHaveLength(0);
    });
  });

  describe("computeAvailableChains", () => {
    it("returns chains matching player level", () => {
      const state = initializeChainState();
      const available = computeAvailableChains(state, 1);
      expect(available).toContain("rowan-history");
    });

    it("excludes chains above player level", () => {
      const state = initializeChainState();
      const available = computeAvailableChains(state, 1);
      expect(available).not.toContain("sage-lore"); // requires level 8
    });

    it("returns more chains at higher levels", () => {
      const state = initializeChainState();
      const lowLevel = computeAvailableChains(state, 1);
      const highLevel = computeAvailableChains(state, 10);
      expect(highLevel.length).toBeGreaterThan(lowLevel.length);
    });

    it("excludes completed chains", () => {
      const state = {
        ...initializeChainState(),
        completedChainIds: ["rowan-history"],
      };
      const available = computeAvailableChains(state, 10);
      expect(available).not.toContain("rowan-history");
    });

    it("excludes active chains", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const available = computeAvailableChains(state, 10);
      expect(available).not.toContain("rowan-history");
    });

    it("gates chains behind prerequisites", () => {
      const state = initializeChainState();
      const available = computeAvailableChains(state, 10);
      // "dying-forest" requires "rowan-history" to be completed
      expect(available).not.toContain("dying-forest");
    });

    it("unlocks chains when prerequisites are met", () => {
      const state = {
        ...initializeChainState(),
        completedChainIds: ["rowan-history"],
      };
      const available = computeAvailableChains(state, 10);
      expect(available).toContain("dying-forest");
    });
  });

  describe("startChain", () => {
    it("activates a chain with initial step progress", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      expect(isChainActive("rowan-history", state)).toBe(true);
      expect(state.activeChains["rowan-history"].currentStepIndex).toBe(0);
    });

    it("creates objective progress for the first step", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const stepProgress = getCurrentStepProgress("rowan-history", state);
      expect(stepProgress).toBeDefined();
      expect(stepProgress!.objectives.length).toBeGreaterThan(0);
      expect(stepProgress!.objectives[0].currentProgress).toBe(0);
      expect(stepProgress!.objectives[0].completed).toBe(false);
    });

    it("records the start day", () => {
      const state = startChain(initializeChainState(), "rowan-history", 42);
      expect(state.activeChains["rowan-history"].startedDay).toBe(42);
    });

    it("ignores starting an already active chain", () => {
      let state = startChain(initializeChainState(), "rowan-history", 1);
      const beforeKeys = Object.keys(state.activeChains);
      state = startChain(state, "rowan-history", 2);
      expect(Object.keys(state.activeChains)).toEqual(beforeKeys);
      // startedDay should remain 1, not 2
      expect(state.activeChains["rowan-history"].startedDay).toBe(1);
    });

    it("ignores unknown chain IDs", () => {
      const initial = initializeChainState();
      const state = startChain(initial, "nonexistent", 1);
      expect(state).toBe(initial);
    });
  });

  describe("advanceObjectives", () => {
    it("advances matching objectives", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      // Rowan history step 1 needs trees_planted = 1
      const result = advanceObjectives(state, "trees_planted", 1);
      const progress = getCurrentStepProgress("rowan-history", result.state);
      expect(progress!.objectives[0].currentProgress).toBe(1);
    });

    it("marks objective as completed when target met", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const result = advanceObjectives(state, "trees_planted", 1);
      expect(
        result.state.activeChains["rowan-history"].steps[0].objectives[0]
          .completed,
      ).toBe(true);
    });

    it("marks step as completed when all objectives done", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const result = advanceObjectives(state, "trees_planted", 1);
      expect(result.completedSteps).toHaveLength(1);
      expect(result.completedSteps[0].chainId).toBe("rowan-history");
      expect(result.completedSteps[0].stepId).toBe("rowan-history-1");
    });

    it("does not exceed target amount", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const result = advanceObjectives(state, "trees_planted", 100);
      const obj =
        result.state.activeChains["rowan-history"].steps[0].objectives[0];
      expect(obj.currentProgress).toBe(1); // target is 1
    });

    it("ignores non-matching event types", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const result = advanceObjectives(state, "trees_watered", 5);
      const progress = getCurrentStepProgress("rowan-history", result.state);
      expect(progress!.objectives[0].currentProgress).toBe(0);
    });

    it("returns same state when nothing matches", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const result = advanceObjectives(state, "nonexistent_event", 1);
      expect(result.state).toBe(state); // referential equality — no mutation
    });

    it("advances multiple chains simultaneously", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      // Dying forest also needs trees_planted but requires rowan-history completed
      // Use bramble-weather instead — step 1 needs trees_watered
      state = startChain(state, "bramble-weather", 1);

      // Advance trees_planted — should only affect rowan-history
      const result = advanceObjectives(state, "trees_planted", 1);
      expect(
        result.state.activeChains["rowan-history"].steps[0].objectives[0]
          .completed,
      ).toBe(true);
      // bramble-weather step 1 needs trees_watered, not trees_planted
      expect(
        result.state.activeChains["bramble-weather"].steps[0].objectives[0]
          .currentProgress,
      ).toBe(0);
    });

    it("handles multi-objective steps", () => {
      // Hazel trade step 3 has 4 objectives
      let state = startChain(initializeChainState(), "hazel-trade", 1);
      // Advance to step 3 by completing steps 1 and 2
      let result = advanceObjectives(state, "timber_collected", 15);
      state = result.state;
      const claimed1 = claimStepReward(state, "hazel-trade");
      state = claimed1.state;
      result = advanceObjectives(state, "trees_harvested", 5);
      state = result.state;
      const claimed2 = claimStepReward(state, "hazel-trade");
      state = claimed2.state;

      // Now on step 3 — advance all 4 objectives
      result = advanceObjectives(state, "timber_collected", 20);
      state = result.state;
      result = advanceObjectives(state, "sap_collected", 15);
      state = result.state;
      result = advanceObjectives(state, "fruit_collected", 10);
      state = result.state;
      result = advanceObjectives(state, "acorns_collected", 10);
      state = result.state;

      const progress = state.activeChains["hazel-trade"];
      const currentStep = progress.steps[progress.currentStepIndex];
      expect(currentStep.completed).toBe(true);
    });
  });

  describe("claimStepReward", () => {
    it("returns the step definition for reward application", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const advanced = advanceObjectives(state, "trees_planted", 1);
      const { stepDef } = claimStepReward(advanced.state, "rowan-history");
      expect(stepDef).toBeDefined();
      expect(stepDef!.reward.xp).toBe(25);
      expect(stepDef!.reward.resources).toEqual({ timber: 5 });
    });

    it("advances to the next step", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const advanced = advanceObjectives(state, "trees_planted", 1);
      const { state: claimedState } = claimStepReward(
        advanced.state,
        "rowan-history",
      );
      expect(claimedState.activeChains["rowan-history"].currentStepIndex).toBe(
        1,
      );
    });

    it("creates progress for the next step", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const advanced = advanceObjectives(state, "trees_planted", 1);
      const { state: claimedState } = claimStepReward(
        advanced.state,
        "rowan-history",
      );
      const nextStep = getCurrentStepProgress("rowan-history", claimedState);
      expect(nextStep).toBeDefined();
      expect(nextStep!.objectives[0].currentProgress).toBe(0);
    });

    it("marks chain as completed when last step is claimed", () => {
      // Use bramble-weather which has 3 steps
      let state = startChain(initializeChainState(), "bramble-weather", 1);

      // Step 1: water 10 trees
      let result = advanceObjectives(state, "trees_watered", 10);
      state = result.state;
      state = claimStepReward(state, "bramble-weather").state;

      // Step 2: grow 3 saplings
      result = advanceObjectives(state, "saplings_grown", 3);
      state = result.state;
      state = claimStepReward(state, "bramble-weather").state;

      // Step 3: survive 10 trees through season
      result = advanceObjectives(state, "trees_survived_season", 10);
      state = result.state;
      state = claimStepReward(state, "bramble-weather").state;

      expect(isChainCompleted("bramble-weather", state)).toBe(true);
      expect(isChainActive("bramble-weather", state)).toBe(false);
      expect(state.completedChainIds).toContain("bramble-weather");
    });

    it("prevents double-claiming", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const advanced = advanceObjectives(state, "trees_planted", 1);
      const first = claimStepReward(advanced.state, "rowan-history");
      const second = claimStepReward(first.state, "rowan-history");
      expect(second.stepDef).toBeNull(); // step 2 not yet completed
    });

    it("returns null for uncompleted step", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const { stepDef } = claimStepReward(state, "rowan-history");
      expect(stepDef).toBeNull();
    });

    it("returns null for unknown chain", () => {
      const state = initializeChainState();
      const { stepDef } = claimStepReward(state, "nonexistent");
      expect(stepDef).toBeNull();
    });
  });

  describe("query helpers", () => {
    it("getCurrentStep returns the current step definition", () => {
      const state = startChain(initializeChainState(), "rowan-history", 1);
      const step = getCurrentStep("rowan-history", state);
      expect(step).toBeDefined();
      expect(step!.id).toBe("rowan-history-1");
      expect(step!.name).toBe("The First Seed");
    });

    it("getCurrentStep returns null for inactive chain", () => {
      const state = initializeChainState();
      expect(getCurrentStep("rowan-history", state)).toBeNull();
    });

    it("getActiveChainIds returns correct IDs", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      state = startChain(state, "bramble-weather", 1);
      const ids = getActiveChainIds(state);
      expect(ids).toContain("rowan-history");
      expect(ids).toContain("bramble-weather");
      expect(ids).toHaveLength(2);
    });

    it("getChainTotalSteps returns correct count", () => {
      expect(getChainTotalSteps("rowan-history")).toBe(4);
      expect(getChainTotalSteps("hazel-trade")).toBe(3);
      expect(getChainTotalSteps("dying-forest")).toBe(4);
      expect(getChainTotalSteps("nonexistent")).toBe(0);
    });

    it("isChainActive/isChainCompleted are mutually exclusive", () => {
      let state = startChain(initializeChainState(), "bramble-weather", 1);
      expect(isChainActive("bramble-weather", state)).toBe(true);
      expect(isChainCompleted("bramble-weather", state)).toBe(false);

      // Complete the chain
      let result = advanceObjectives(state, "trees_watered", 10);
      state = claimStepReward(result.state, "bramble-weather").state;
      result = advanceObjectives(state, "saplings_grown", 3);
      state = claimStepReward(result.state, "bramble-weather").state;
      result = advanceObjectives(state, "trees_survived_season", 10);
      state = claimStepReward(result.state, "bramble-weather").state;

      expect(isChainActive("bramble-weather", state)).toBe(false);
      expect(isChainCompleted("bramble-weather", state)).toBe(true);
    });
  });

  describe("step rewards", () => {
    it("rowan-history step rewards escalate", () => {
      const chain = getChainDef("rowan-history")!;
      const xpRewards = chain.steps.map((s) => s.reward.xp);
      // Each step should reward more XP than the last
      for (let i = 1; i < xpRewards.length; i++) {
        expect(xpRewards[i]).toBeGreaterThan(xpRewards[i - 1]);
      }
    });

    it("sage-lore rewards include seeds and friendship", () => {
      const chain = getChainDef("sage-lore")!;
      const step2 = chain.steps[1];
      expect(step2.reward.seeds).toBeDefined();
      expect(step2.reward.friendshipPoints).toBe(10);
    });

    it("dying-forest final step has large rewards", () => {
      const chain = getChainDef("dying-forest")!;
      const finalStep = chain.steps[chain.steps.length - 1];
      expect(finalStep.reward.xp).toBeGreaterThanOrEqual(500);
    });

    it("oakley-crafting steps unlock recipes", () => {
      const chain = getChainDef("oakley-crafting")!;
      const step1 = chain.steps[0];
      expect(step1.reward.unlockRecipe).toBe("wooden-plank");
    });
  });
});
