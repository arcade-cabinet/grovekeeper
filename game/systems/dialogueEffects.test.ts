/**
 * Dialogue effect application tests (Spec §15, §17).
 *
 * Covers:
 * - start_quest: starts chain, no-op for unknown chain, idempotent, no completedSteps
 * - advance_quest: advances objective, completes step, default amount=1, no active chain
 * - Multiple effects in one array (start then advance)
 * - Non-quest effect types are ignored
 */

import type { DialogueEffect } from "@/game/ecs/components/dialogue";
import { initializeChainState } from "@/game/quests/questChainEngine";
import { applyDialogueEffects } from "./dialogueEffects.ts";

// ---------------------------------------------------------------------------
// start_quest (Spec §15, §17)
// ---------------------------------------------------------------------------

describe("applyDialogueEffects — start_quest (Spec §15, §17)", () => {
  it("starts a quest chain when type is start_quest", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "start_quest", value: "rowan-history" }];
    const result = applyDialogueEffects(effects, state, 1);
    expect("rowan-history" in result.state.activeChains).toBe(true);
  });

  it("returns unchanged state (same reference) for unknown chainId", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "start_quest", value: "nonexistent-chain" }];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.state).toBe(state);
  });

  it("is idempotent — starting an already-active chain does not double-add it", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "start_quest", value: "rowan-history" }];
    const { state: after1 } = applyDialogueEffects(effects, state, 1);
    const { state: after2 } = applyDialogueEffects(effects, after1, 1);
    expect(after2).toBe(after1);
  });

  it("returns no completedSteps when only starting a chain", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "start_quest", value: "rowan-history" }];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.completedSteps).toHaveLength(0);
  });

  it("initialises the chain at step 0 with zero progress", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "start_quest", value: "rowan-history" }];
    const { state: after } = applyDialogueEffects(effects, state, 1);
    const progress = after.activeChains["rowan-history"];
    expect(progress?.currentStepIndex).toBe(0);
    expect(progress?.steps[0]?.objectives[0]?.currentProgress).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// advance_quest (Spec §15, §17)
// ---------------------------------------------------------------------------

describe("applyDialogueEffects — advance_quest (Spec §15, §17)", () => {
  function startedState() {
    const state = initializeChainState();
    return applyDialogueEffects([{ type: "start_quest", value: "rowan-history" }], state, 1).state;
  }

  it("advances quest objective progress by the given amount", () => {
    const state = startedState();
    const effects: DialogueEffect[] = [
      { type: "advance_quest", value: "trees_planted", amount: 1 },
    ];
    const result = applyDialogueEffects(effects, state, 1);
    const obj = result.state.activeChains["rowan-history"]?.steps[0]?.objectives[0];
    expect(obj?.currentProgress).toBe(1);
  });

  it("completes a step when advance fills the objective", () => {
    // rowan-history step 1: trees_planted targetAmount=1
    const state = startedState();
    const result = applyDialogueEffects(
      [{ type: "advance_quest", value: "trees_planted", amount: 1 }],
      state,
      1,
    );
    expect(result.completedSteps).toHaveLength(1);
    expect(result.completedSteps[0]?.chainId).toBe("rowan-history");
    expect(result.completedSteps[0]?.stepId).toBe("rowan-history-1");
  });

  it("defaults amount to 1 when amount is not specified", () => {
    const state = startedState();
    const effects: DialogueEffect[] = [{ type: "advance_quest", value: "trees_planted" }];
    const result = applyDialogueEffects(effects, state, 1);
    const obj = result.state.activeChains["rowan-history"]?.steps[0]?.objectives[0];
    expect(obj?.currentProgress).toBe(1);
  });

  it("returns unchanged state (same reference) when no active chain matches the event", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "advance_quest", value: "unknown_event" }];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.state).toBe(state);
    expect(result.completedSteps).toHaveLength(0);
  });

  it("does not advance objectives that belong to a different event type", () => {
    const state = startedState();
    const result = applyDialogueEffects(
      [{ type: "advance_quest", value: "saplings_grown", amount: 1 }],
      state,
      1,
    );
    // trees_planted objective should be untouched
    const obj = result.state.activeChains["rowan-history"]?.steps[0]?.objectives[0];
    expect(obj?.currentProgress).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple effects and edge cases (Spec §15, §17)
// ---------------------------------------------------------------------------

describe("applyDialogueEffects — multiple effects (Spec §15, §17)", () => {
  it("applies start_quest then advance_quest in order", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [
      { type: "start_quest", value: "rowan-history" },
      { type: "advance_quest", value: "trees_planted", amount: 1 },
    ];
    const result = applyDialogueEffects(effects, state, 1);
    expect("rowan-history" in result.state.activeChains).toBe(true);
    const obj = result.state.activeChains["rowan-history"]?.steps[0]?.objectives[0];
    expect(obj?.currentProgress).toBe(1);
    expect(result.completedSteps).toHaveLength(1);
  });

  it("returns unchanged state and empty completedSteps for empty effects array", () => {
    const state = initializeChainState();
    const result = applyDialogueEffects([], state, 1);
    expect(result.state).toBe(state);
    expect(result.completedSteps).toHaveLength(0);
  });

  it("ignores non-quest, non-unlock effect types (give_item, give_xp)", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [
      { type: "give_item", value: "oak-seed", amount: 1 },
      { type: "give_xp", value: 50 },
    ];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.state).toBe(state);
    expect(result.completedSteps).toHaveLength(0);
    expect(result.unlockedSpecies).toHaveLength(0);
  });

  it("returns empty unlockedSpecies when no unlock_species effect present", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "start_quest", value: "rowan-history" }];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.unlockedSpecies).toHaveLength(0);
  });

  it("collects completedSteps across multiple advance_quest effects", () => {
    // Start two chains; advance both to completion in one call
    let state = initializeChainState();
    state = applyDialogueEffects([{ type: "start_quest", value: "rowan-history" }], state, 1).state;
    state = applyDialogueEffects(
      [{ type: "start_quest", value: "main-quest-spirits" }],
      state,
      1,
    ).state;

    // Advance rowan-history step 1 (trees_planted x1) to completion
    const result = applyDialogueEffects(
      [{ type: "advance_quest", value: "trees_planted", amount: 1 }],
      state,
      1,
    );
    const ids = result.completedSteps.map((s) => s.chainId);
    expect(ids).toContain("rowan-history");
  });
});

// ---------------------------------------------------------------------------
// unlock_species (Spec §15, §17)
// ---------------------------------------------------------------------------

describe("applyDialogueEffects — unlock_species (Spec §15, §17)", () => {
  it("returns the species id in unlockedSpecies array", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "unlock_species", value: "elder-pine" }];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.unlockedSpecies).toEqual(["elder-pine"]);
  });

  it("does not mutate quest chain state for unlock_species only effect", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [{ type: "unlock_species", value: "elder-pine" }];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.state).toBe(state);
    expect(result.completedSteps).toHaveLength(0);
  });

  it("deduplicates the same speciesId appearing multiple times", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [
      { type: "unlock_species", value: "elder-pine" },
      { type: "unlock_species", value: "elder-pine" },
    ];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.unlockedSpecies).toEqual(["elder-pine"]);
  });

  it("collects multiple distinct species from multiple unlock_species effects", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [
      { type: "unlock_species", value: "elder-pine" },
      { type: "unlock_species", value: "silver-birch" },
    ];
    const result = applyDialogueEffects(effects, state, 1);
    expect(result.unlockedSpecies).toContain("elder-pine");
    expect(result.unlockedSpecies).toContain("silver-birch");
    expect(result.unlockedSpecies).toHaveLength(2);
  });

  it("can combine unlock_species with quest effects in the same call", () => {
    const state = initializeChainState();
    const effects: DialogueEffect[] = [
      { type: "start_quest", value: "rowan-history" },
      { type: "unlock_species", value: "ancient-oak" },
    ];
    const result = applyDialogueEffects(effects, state, 1);
    expect("rowan-history" in result.state.activeChains).toBe(true);
    expect(result.unlockedSpecies).toEqual(["ancient-oak"]);
  });

  it("returns empty unlockedSpecies when no unlock_species effects present", () => {
    const state = initializeChainState();
    const result = applyDialogueEffects([], state, 1);
    expect(result.unlockedSpecies).toHaveLength(0);
  });
});
