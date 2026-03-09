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
} from "./questChainEngine.ts";

describe("questChainEngine", () => {
  describe("initializeChainState", () => {
    it("returns empty state", () => {
      const state = initializeChainState();
      expect(state.activeChains).toEqual({});
      expect(state.completedChainIds).toEqual([]);
      expect(state.availableChainIds).toEqual([]);
    });
  });

  describe("data access", () => {
    it("getChainDef returns a known chain", () => {
      const def = getChainDef("rowan-history");
      expect(def).toBeDefined();
      expect(def!.name).toBe("Roots of the Past");
      expect(def!.npcId).toBe("elder-rowan");
    });

    it("getChainDef returns undefined for unknown chain", () => {
      expect(getChainDef("nonexistent")).toBeUndefined();
    });

    it("getAllChainDefs returns all chains", () => {
      const defs = getAllChainDefs();
      expect(defs.length).toBeGreaterThanOrEqual(7);
    });

    it("getChainTotalSteps returns step count", () => {
      expect(getChainTotalSteps("rowan-history")).toBe(4);
      expect(getChainTotalSteps("nonexistent")).toBe(0);
    });
  });

  describe("computeAvailableChains", () => {
    it("returns chains available at level 1", () => {
      const state = initializeChainState();
      const available = computeAvailableChains(state, 1);
      expect(available).toContain("rowan-history");
      // hazel-trade requires level 2
      expect(available).not.toContain("hazel-trade");
    });

    it("returns more chains at higher levels", () => {
      const state = initializeChainState();
      const atLevel1 = computeAvailableChains(state, 1);
      const atLevel5 = computeAvailableChains(state, 5);
      expect(atLevel5.length).toBeGreaterThan(atLevel1.length);
    });

    it("excludes active chains", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const available = computeAvailableChains(state, 10);
      expect(available).not.toContain("rowan-history");
    });

    it("excludes completed chains", () => {
      const state = {
        ...initializeChainState(),
        completedChainIds: ["rowan-history"],
      };
      const available = computeAvailableChains(state, 10);
      expect(available).not.toContain("rowan-history");
    });

    it("excludes chains with unmet prerequisites", () => {
      // dying-forest requires prerequisiteChainIds: ["rowan-history"]
      const state = initializeChainState();
      const available = computeAvailableChains(state, 10);
      expect(available).not.toContain("dying-forest");
    });

    it("includes chains when prerequisites are met", () => {
      const state = {
        ...initializeChainState(),
        completedChainIds: ["rowan-history"],
      };
      const available = computeAvailableChains(state, 10);
      expect(available).toContain("dying-forest");
    });
  });

  describe("startChain", () => {
    it("creates progress for the first step", () => {
      const state = initializeChainState();
      const updated = startChain(state, "rowan-history", 1);
      expect(updated.activeChains["rowan-history"]).toBeDefined();
      const progress = updated.activeChains["rowan-history"];
      expect(progress.chainId).toBe("rowan-history");
      expect(progress.currentStepIndex).toBe(0);
      expect(progress.completed).toBe(false);
      expect(progress.startedDay).toBe(1);
      expect(progress.steps.length).toBe(1);
    });

    it("initializes step objectives with zero progress", () => {
      const state = initializeChainState();
      const updated = startChain(state, "rowan-history", 1);
      const step = updated.activeChains["rowan-history"].steps[0];
      expect(step.completed).toBe(false);
      expect(step.rewardClaimed).toBe(false);
      for (const obj of step.objectives) {
        expect(obj.currentProgress).toBe(0);
        expect(obj.completed).toBe(false);
      }
    });

    it("does not restart an already active chain", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const before = state.activeChains["rowan-history"];
      state = startChain(state, "rowan-history", 5);
      expect(state.activeChains["rowan-history"]).toBe(before);
    });

    it("returns same state for unknown chain", () => {
      const state = initializeChainState();
      const result = startChain(state, "nonexistent", 1);
      expect(result).toBe(state);
    });

    it("removes chain from availableChainIds when started", () => {
      const state = {
        ...initializeChainState(),
        availableChainIds: ["rowan-history", "hazel-trade"],
      };
      const updated = startChain(state, "rowan-history", 1);
      expect(updated.availableChainIds).not.toContain("rowan-history");
      expect(updated.availableChainIds).toContain("hazel-trade");
    });
  });

  describe("advanceObjectives", () => {
    it("advances matching objectives", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      // rowan-history step 0 objective: trees_planted, targetAmount: 1
      const result = advanceObjectives(state, "trees_planted", 1);
      const step = result.state.activeChains["rowan-history"].steps[0];
      const obj = step.objectives[0];
      expect(obj.currentProgress).toBe(1);
      expect(obj.completed).toBe(true);
      expect(step.completed).toBe(true);
    });

    it("returns completed step in the completedSteps list", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const result = advanceObjectives(state, "trees_planted", 1);
      expect(result.completedSteps).toEqual([
        { chainId: "rowan-history", stepId: "rowan-history-1" },
      ]);
    });

    it("does not exceed target amount", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const result = advanceObjectives(state, "trees_planted", 100);
      const obj = result.state.activeChains["rowan-history"].steps[0].objectives[0];
      expect(obj.currentProgress).toBe(1); // target is 1
    });

    it("ignores non-matching event types", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const result = advanceObjectives(state, "trees_watered", 10);
      expect(result.completedSteps).toEqual([]);
      // State should be unchanged
      expect(result.state).toBe(state);
    });

    it("advances objectives across multiple chains", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      // blossom-seeds step 0: trees_planted, targetAmount: 5
      state = startChain(state, "blossom-seeds", 1);
      const result = advanceObjectives(state, "trees_planted", 1);
      // rowan step should complete (target 1), blossom step should advance (1/5)
      expect(result.completedSteps).toEqual([
        { chainId: "rowan-history", stepId: "rowan-history-1" },
      ]);
      const blossomObj = result.state.activeChains["blossom-seeds"].steps[0].objectives[0];
      expect(blossomObj.currentProgress).toBe(1);
      expect(blossomObj.completed).toBe(false);
    });
  });

  describe("claimStepReward", () => {
    it("returns the step definition for reward application", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const advanced = advanceObjectives(state, "trees_planted", 1);
      const result = claimStepReward(advanced.state, "rowan-history");
      expect(result.stepDef).not.toBeNull();
      expect(result.stepDef!.id).toBe("rowan-history-1");
      expect(result.stepDef!.reward.xp).toBe(25);
    });

    it("advances to the next step after claiming", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const advanced = advanceObjectives(state, "trees_planted", 1);
      const result = claimStepReward(advanced.state, "rowan-history");
      const progress = result.state.activeChains["rowan-history"];
      expect(progress.currentStepIndex).toBe(1);
      expect(progress.steps.length).toBe(2);
    });

    it("completes the chain when last step reward is claimed", () => {
      // Use a chain we can complete step by step
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const def = getChainDef("rowan-history")!;

      // Complete and claim all 4 steps
      for (let i = 0; i < def.steps.length; i++) {
        const stepDef = def.steps[i];
        for (const obj of stepDef.objectives) {
          const result = advanceObjectives(state, obj.targetType, obj.targetAmount);
          state = result.state;
        }
        const claimed = claimStepReward(state, "rowan-history");
        state = claimed.state;
      }

      expect(state.completedChainIds).toContain("rowan-history");
      expect(state.activeChains["rowan-history"]).toBeUndefined();
    });

    it("returns null stepDef when step is not completed", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const result = claimStepReward(state, "rowan-history");
      expect(result.stepDef).toBeNull();
    });

    it("returns null stepDef when chain does not exist", () => {
      const state = initializeChainState();
      const result = claimStepReward(state, "nonexistent");
      expect(result.stepDef).toBeNull();
    });

    it("does not allow claiming the same reward twice", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const advanced = advanceObjectives(state, "trees_planted", 1);
      const first = claimStepReward(advanced.state, "rowan-history");
      // Try to claim again -- should return null since we already advanced
      const second = claimStepReward(first.state, "rowan-history");
      // The current step (index 1) is not yet completed
      expect(second.stepDef).toBeNull();
    });
  });

  describe("query helpers", () => {
    it("getCurrentStep returns current step definition", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const step = getCurrentStep("rowan-history", state);
      expect(step).not.toBeNull();
      expect(step!.id).toBe("rowan-history-1");
    });

    it("getCurrentStep returns null for inactive chain", () => {
      const state = initializeChainState();
      expect(getCurrentStep("rowan-history", state)).toBeNull();
    });

    it("getCurrentStepProgress returns progress for current step", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      const progress = getCurrentStepProgress("rowan-history", state);
      expect(progress).not.toBeNull();
      expect(progress!.stepId).toBe("rowan-history-1");
    });

    it("isChainActive returns true for active chain", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      expect(isChainActive("rowan-history", state)).toBe(true);
      expect(isChainActive("hazel-trade", state)).toBe(false);
    });

    it("isChainCompleted returns true for completed chain", () => {
      const state = {
        ...initializeChainState(),
        completedChainIds: ["rowan-history"],
      };
      expect(isChainCompleted("rowan-history", state)).toBe(true);
      expect(isChainCompleted("hazel-trade", state)).toBe(false);
    });

    it("getActiveChainIds returns all active chain IDs", () => {
      let state = initializeChainState();
      state = startChain(state, "rowan-history", 1);
      state = startChain(state, "hazel-trade", 1);
      const ids = getActiveChainIds(state);
      expect(ids).toContain("rowan-history");
      expect(ids).toContain("hazel-trade");
      expect(ids.length).toBe(2);
    });
  });
});
