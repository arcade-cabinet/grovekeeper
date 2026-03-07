import { useGameStore } from "./index";

describe("Quest State Store (Spec §14, §16)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("Quest actions", () => {
    const mockQuest = {
      id: "quest_1",
      name: "Test Quest",
      description: "Test",
      goals: [
        {
          id: "goal_1",
          templateId: "plant_any_1",
          name: "Plant",
          description: "Plant a tree",
          targetType: "trees_planted",
          targetAmount: 1,
          currentProgress: 0,
          completed: false,
        },
      ],
      startedAt: 1000,
      completed: false,
      rewards: { xp: 50 },
      difficulty: "easy" as const,
    };

    it("setActiveQuests sets the quest array", () => {
      useGameStore.getState().setActiveQuests([mockQuest]);
      expect(useGameStore.getState().activeQuests).toHaveLength(1);
      expect(useGameStore.getState().activeQuests[0].id).toBe("quest_1");
    });

    it("updateQuest replaces the matching quest", () => {
      useGameStore.getState().setActiveQuests([mockQuest]);
      const updated = { ...mockQuest, completed: true };
      useGameStore.getState().updateQuest("quest_1", updated);
      expect(useGameStore.getState().activeQuests[0].completed).toBe(true);
    });

    it("completeQuest removes from active and adds to completed", () => {
      useGameStore.getState().setActiveQuests([mockQuest]);
      useGameStore.getState().completeQuest("quest_1");
      expect(useGameStore.getState().activeQuests).toHaveLength(0);
      expect(useGameStore.getState().completedQuestIds).toContain("quest_1");
    });

    it("setLastQuestRefresh updates the timestamp", () => {
      useGameStore.getState().setLastQuestRefresh(12345);
      expect(useGameStore.getState().lastQuestRefresh).toBe(12345);
    });
  });
});
