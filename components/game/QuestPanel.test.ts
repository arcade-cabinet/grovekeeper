/**
 * Tests for QuestPanel data types and display logic.
 */

import type { ActiveQuestDisplay, QuestObjectiveDisplay } from "./QuestPanel";

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
