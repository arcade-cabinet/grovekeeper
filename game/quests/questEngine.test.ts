/**
 * Tests for the quest state machine (Spec §14).
 *
 * Covers state transitions (available->active->completed|failed),
 * step tracking, and objective text.
 */

import {
  advanceQuestStep,
  completeCurrentStep,
  createQuest,
  failQuest,
  getObjectiveText,
  isQuestActive,
  isQuestCompleted,
  isQuestFailed,
  startQuest,
} from "./questEngine";

const SAMPLE_DEF = {
  id: "test-quest",
  title: "Test Quest",
  description: "A test quest.",
  steps: [
    { id: "step-1", objectiveText: "Plant 3 trees", targetType: "trees_planted", targetAmount: 3 },
    { id: "step-2", objectiveText: "Water 5 trees", targetType: "trees_watered", targetAmount: 5 },
  ],
};

describe("questEngine (Spec §14)", () => {
  describe("createQuest", () => {
    it("initializes quest in available state", () => {
      const quest = createQuest(SAMPLE_DEF);
      expect(quest.state).toBe("available");
    });

    it("initializes step tracking at index 0", () => {
      const quest = createQuest(SAMPLE_DEF);
      expect(quest.currentStepIndex).toBe(0);
    });

    it("initializes step progress at zero for all steps", () => {
      const quest = createQuest(SAMPLE_DEF);
      for (const step of quest.steps) {
        expect(step.currentProgress).toBe(0);
        expect(step.completed).toBe(false);
      }
    });

    it("preserves quest id, title, and description", () => {
      const quest = createQuest(SAMPLE_DEF);
      expect(quest.id).toBe("test-quest");
      expect(quest.title).toBe("Test Quest");
      expect(quest.description).toBe("A test quest.");
    });
  });

  describe("startQuest", () => {
    it("transitions from available to active", () => {
      const quest = createQuest(SAMPLE_DEF);
      const started = startQuest(quest);
      expect(started.state).toBe("active");
    });

    it("returns same quest if not in available state", () => {
      const quest = createQuest(SAMPLE_DEF);
      const active = startQuest(quest);
      const again = startQuest(active);
      expect(again).toBe(active);
    });
  });

  describe("failQuest", () => {
    it("transitions from active to failed", () => {
      const quest = startQuest(createQuest(SAMPLE_DEF));
      const failed = failQuest(quest);
      expect(failed.state).toBe("failed");
    });

    it("returns same quest if not in active state", () => {
      const quest = createQuest(SAMPLE_DEF);
      const result = failQuest(quest);
      expect(result).toBe(quest);
    });
  });

  describe("completeCurrentStep", () => {
    it("marks the current step as completed", () => {
      const quest = startQuest(createQuest(SAMPLE_DEF));
      const updated = completeCurrentStep(quest);
      expect(updated.steps[0].completed).toBe(true);
    });

    it("does not affect subsequent steps", () => {
      const quest = startQuest(createQuest(SAMPLE_DEF));
      const updated = completeCurrentStep(quest);
      expect(updated.steps[1].completed).toBe(false);
    });

    it("returns same quest if not active", () => {
      const quest = createQuest(SAMPLE_DEF);
      expect(completeCurrentStep(quest)).toBe(quest);
    });
  });

  describe("advanceQuestStep", () => {
    it("increments currentStepIndex after completing a step", () => {
      let quest = startQuest(createQuest(SAMPLE_DEF));
      quest = completeCurrentStep(quest);
      const advanced = advanceQuestStep(quest);
      expect(advanced.currentStepIndex).toBe(1);
    });

    it("transitions to completed when last step is advanced", () => {
      let quest = startQuest(createQuest(SAMPLE_DEF));
      quest = completeCurrentStep(quest);
      quest = advanceQuestStep(quest);
      quest = completeCurrentStep(quest);
      const done = advanceQuestStep(quest);
      expect(done.state).toBe("completed");
    });

    it("returns same quest if current step is not completed", () => {
      const quest = startQuest(createQuest(SAMPLE_DEF));
      const result = advanceQuestStep(quest);
      expect(result).toBe(quest);
    });

    it("returns same quest if not active", () => {
      const quest = createQuest(SAMPLE_DEF);
      expect(advanceQuestStep(quest)).toBe(quest);
    });
  });

  describe("getObjectiveText", () => {
    it("returns objective text for the current step", () => {
      const quest = startQuest(createQuest(SAMPLE_DEF));
      expect(getObjectiveText(quest)).toBe("Plant 3 trees");
    });

    it("returns next step objective after advancing", () => {
      let quest = startQuest(createQuest(SAMPLE_DEF));
      quest = completeCurrentStep(quest);
      quest = advanceQuestStep(quest);
      expect(getObjectiveText(quest)).toBe("Water 5 trees");
    });

    it("returns null when quest is not active", () => {
      const quest = createQuest(SAMPLE_DEF);
      expect(getObjectiveText(quest)).toBeNull();
    });
  });

  describe("state query helpers", () => {
    it("isQuestActive returns true for active quest", () => {
      const quest = startQuest(createQuest(SAMPLE_DEF));
      expect(isQuestActive(quest)).toBe(true);
    });

    it("isQuestCompleted returns true for completed quest", () => {
      let quest = startQuest(createQuest(SAMPLE_DEF));
      quest = completeCurrentStep(quest);
      quest = advanceQuestStep(quest);
      quest = completeCurrentStep(quest);
      quest = advanceQuestStep(quest);
      expect(isQuestCompleted(quest)).toBe(true);
    });

    it("isQuestFailed returns true for failed quest", () => {
      const quest = failQuest(startQuest(createQuest(SAMPLE_DEF)));
      expect(isQuestFailed(quest)).toBe(true);
    });

    it("helpers return false for wrong states", () => {
      const available = createQuest(SAMPLE_DEF);
      expect(isQuestActive(available)).toBe(false);
      expect(isQuestCompleted(available)).toBe(false);
      expect(isQuestFailed(available)).toBe(false);
    });
  });
});
