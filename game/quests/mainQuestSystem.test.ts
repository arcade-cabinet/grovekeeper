/**
 * Main Quest System tests -- Spec §32.3.
 *
 * Covers:
 * - spirit_discovered events advance the main quest step objective
 * - After 8 discoveries + reward claim, main quest is complete
 * - Worldroot's Dream becomes available only after completion
 */

import {
  advanceObjectives,
  claimStepReward,
  computeAvailableChains,
  getChainDef,
  initializeChainState,
  startChain,
} from "./questChainEngine";
import {
  MAIN_QUEST_CHAIN_ID,
  TOTAL_SPIRITS,
  WORLDROOTS_DREAM_CHAIN_ID,
  getSpiritDiscoveryCount,
  isMainQuestComplete,
  isWorldrootsDreamAvailable,
} from "./mainQuestSystem";

// Helper: start the main quest chain and advance spirit_discovered N times
function buildStateWithSpirits(count: number) {
  let state = initializeChainState();
  state = startChain(state, MAIN_QUEST_CHAIN_ID, 1);
  for (let i = 0; i < count; i++) {
    state = advanceObjectives(state, "spirit_discovered", 1).state;
  }
  return state;
}

describe("mainQuestSystem (Spec §32.3)", () => {
  describe("chain definition", () => {
    it("main-quest-spirits chain exists with 1 step targeting 8 spirit discoveries", () => {
      const def = getChainDef(MAIN_QUEST_CHAIN_ID);
      expect(def).toBeDefined();
      expect(def!.steps).toHaveLength(1);
      expect(def!.steps[0]!.objectives[0]!.targetType).toBe("spirit_discovered");
      expect(def!.steps[0]!.objectives[0]!.targetAmount).toBe(TOTAL_SPIRITS);
    });

    it("worldroots-dream chain exists with main-quest-spirits as prerequisite", () => {
      const def = getChainDef(WORLDROOTS_DREAM_CHAIN_ID);
      expect(def).toBeDefined();
      expect(def!.prerequisiteChainIds).toContain(MAIN_QUEST_CHAIN_ID);
    });

    it("TOTAL_SPIRITS constant matches chain definition", () => {
      const def = getChainDef(MAIN_QUEST_CHAIN_ID);
      expect(def!.steps[0]!.objectives[0]!.targetAmount).toBe(TOTAL_SPIRITS);
    });
  });

  describe("getSpiritDiscoveryCount", () => {
    it("returns 0 before the chain is started", () => {
      const state = initializeChainState();
      expect(getSpiritDiscoveryCount(state)).toBe(0);
    });

    it("returns 0 for a newly started chain", () => {
      let state = initializeChainState();
      state = startChain(state, MAIN_QUEST_CHAIN_ID, 1);
      expect(getSpiritDiscoveryCount(state)).toBe(0);
    });

    it("increments by 1 with each spirit_discovered event", () => {
      let state = initializeChainState();
      state = startChain(state, MAIN_QUEST_CHAIN_ID, 1);
      for (let i = 1; i <= 5; i++) {
        state = advanceObjectives(state, "spirit_discovered", 1).state;
        expect(getSpiritDiscoveryCount(state)).toBe(i);
      }
    });

    it("returns TOTAL_SPIRITS after chain completes", () => {
      let state = buildStateWithSpirits(TOTAL_SPIRITS);
      state = claimStepReward(state, MAIN_QUEST_CHAIN_ID).state;
      expect(getSpiritDiscoveryCount(state)).toBe(TOTAL_SPIRITS);
    });
  });

  describe("each spirit discovery advances main quest (Spec §32.3)", () => {
    it("spirit_discovered event increments discovery count by 1", () => {
      let state = initializeChainState();
      state = startChain(state, MAIN_QUEST_CHAIN_ID, 1);

      const before = getSpiritDiscoveryCount(state);
      state = advanceObjectives(state, "spirit_discovered", 1).state;
      expect(getSpiritDiscoveryCount(state)).toBe(before + 1);
    });

    it("unrelated events do not advance the spirit quest", () => {
      let state = initializeChainState();
      state = startChain(state, MAIN_QUEST_CHAIN_ID, 1);
      state = advanceObjectives(state, "trees_planted", 5).state;
      expect(getSpiritDiscoveryCount(state)).toBe(0);
    });

    it("8th spirit discovery marks the step as completed", () => {
      const state = buildStateWithSpirits(TOTAL_SPIRITS);
      const step = state.activeChains[MAIN_QUEST_CHAIN_ID]?.steps[0];
      expect(step?.completed).toBe(true);
    });

    it("completedSteps is reported on 8th discovery", () => {
      let state = buildStateWithSpirits(TOTAL_SPIRITS - 1);
      const result = advanceObjectives(state, "spirit_discovered", 1);
      expect(result.completedSteps).toContainEqual({
        chainId: MAIN_QUEST_CHAIN_ID,
        stepId: "mqs-awaken-all",
      });
    });
  });

  describe("isMainQuestComplete", () => {
    it("returns false before chain starts", () => {
      expect(isMainQuestComplete(initializeChainState())).toBe(false);
    });

    it("returns false while chain is active with fewer than 8 spirits", () => {
      const state = buildStateWithSpirits(5);
      expect(isMainQuestComplete(state)).toBe(false);
    });

    it("returns false after 8 discoveries but before reward is claimed", () => {
      const state = buildStateWithSpirits(TOTAL_SPIRITS);
      expect(isMainQuestComplete(state)).toBe(false);
    });

    it("returns true after all 8 spirits discovered and reward claimed", () => {
      let state = buildStateWithSpirits(TOTAL_SPIRITS);
      state = claimStepReward(state, MAIN_QUEST_CHAIN_ID).state;
      expect(isMainQuestComplete(state)).toBe(true);
    });
  });

  describe("isWorldrootsDreamAvailable (Spec §30 quest #8)", () => {
    it("returns false before main quest starts", () => {
      expect(isWorldrootsDreamAvailable(initializeChainState(), 1)).toBe(false);
    });

    it("returns false while main quest is active with fewer than 8 spirits", () => {
      const state = buildStateWithSpirits(5);
      expect(isWorldrootsDreamAvailable(state, 1)).toBe(false);
    });

    it("returns false after 8 discoveries but before reward is claimed", () => {
      const state = buildStateWithSpirits(TOTAL_SPIRITS);
      expect(isWorldrootsDreamAvailable(state, 1)).toBe(false);
    });

    it("becomes available after main quest completes", () => {
      let state = buildStateWithSpirits(TOTAL_SPIRITS);
      state = claimStepReward(state, MAIN_QUEST_CHAIN_ID).state;
      expect(isWorldrootsDreamAvailable(state, 1)).toBe(true);
    });

    it("worldroots-dream is included in computeAvailableChains after completion", () => {
      let state = buildStateWithSpirits(TOTAL_SPIRITS);
      state = claimStepReward(state, MAIN_QUEST_CHAIN_ID).state;
      const available = computeAvailableChains(state, 1);
      expect(available).toContain(WORLDROOTS_DREAM_CHAIN_ID);
    });
  });
});
