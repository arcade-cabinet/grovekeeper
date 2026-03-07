/**
 * Tutorial state machine tests — Spec §25.1
 */

import {
  initialTutorialState,
  tickTutorial,
  advanceStep,
  skipTutorial,
  isTutorialComplete,
  currentStepDef,
  currentStepLabel,
  TUTORIAL_STEPS,
} from "./tutorial";

describe("Tutorial system (Spec §25.1)", () => {
  describe("initialTutorialState", () => {
    it("starts on 'look' step, not completed", () => {
      const state = initialTutorialState();
      expect(state.currentStep).toBe("look");
      expect(state.completed).toBe(false);
    });
  });

  describe("currentStepDef", () => {
    it("returns step definition for current step", () => {
      const state = initialTutorialState();
      const def = currentStepDef(state);
      expect(def).not.toBeNull();
      expect(def?.id).toBe("look");
    });

    it("returns null when completed", () => {
      const done = skipTutorial(initialTutorialState());
      expect(currentStepDef(done)).toBeNull();
    });

    it("returns null when currentStep is 'done'", () => {
      const done = { currentStep: "done" as const, completed: true };
      expect(currentStepDef(done)).toBeNull();
    });
  });

  describe("currentStepLabel", () => {
    it("returns label string for current step", () => {
      const state = initialTutorialState();
      const label = currentStepLabel(state);
      expect(typeof label).toBe("string");
      expect((label ?? "").length).toBeGreaterThan(0);
    });

    it("returns null when done", () => {
      expect(currentStepLabel(skipTutorial(initialTutorialState()))).toBeNull();
    });
  });

  describe("tickTutorial", () => {
    it("advances step on correct signal", () => {
      const state = initialTutorialState(); // step: look
      const next = tickTutorial(state, "action:look");
      expect(next.currentStep).toBe("move");
    });

    it("does not advance on wrong signal", () => {
      const state = initialTutorialState(); // expects action:look
      const next = tickTutorial(state, "action:move"); // wrong signal
      expect(next.currentStep).toBe("look");
      expect(next).toBe(state); // same reference — no new object allocated
    });

    it("does not advance if already done", () => {
      const done = skipTutorial(initialTutorialState());
      const next = tickTutorial(done, "action:look");
      expect(next).toBe(done); // same reference
    });

    it("advances through all 11 steps in order", () => {
      const expectedOrder = [
        "look",
        "move",
        "equip",
        "dig",
        "plant",
        "water",
        "wait",
        "harvest",
        "talk",
        "campfire",
        "explore",
      ];

      let state = initialTutorialState();
      for (const stepId of expectedOrder) {
        expect(state.currentStep).toBe(stepId);
        const def = TUTORIAL_STEPS.find((s) => s.id === stepId);
        expect(def).toBeDefined();
        state = tickTutorial(state, def!.signal);
      }

      expect(state.currentStep).toBe("done");
      expect(state.completed).toBe(true);
    });

    it("produces a new state object when advancing", () => {
      const state = initialTutorialState();
      const next = tickTutorial(state, "action:look");
      expect(next).not.toBe(state);
    });
  });

  describe("advanceStep", () => {
    it("moves from first step to second", () => {
      const state = initialTutorialState();
      const next = advanceStep(state);
      expect(next.currentStep).toBe("move");
      expect(next.completed).toBe(false);
    });

    it("marks completed when advancing past last step", () => {
      const state = { currentStep: "explore" as const, completed: false };
      const next = advanceStep(state);
      expect(next.currentStep).toBe("done");
      expect(next.completed).toBe(true);
    });

    it("returns done if called on 'done' step", () => {
      const state = { currentStep: "done" as const, completed: true };
      const next = advanceStep(state);
      expect(next.currentStep).toBe("done");
      expect(next.completed).toBe(true);
    });
  });

  describe("skipTutorial", () => {
    it("marks tutorial as done immediately", () => {
      const state = initialTutorialState();
      const done = skipTutorial(state);
      expect(done.currentStep).toBe("done");
      expect(done.completed).toBe(true);
    });

    it("is idempotent when called on an already-done state", () => {
      const done = skipTutorial(initialTutorialState());
      const done2 = skipTutorial(done);
      expect(done2.currentStep).toBe("done");
      expect(done2.completed).toBe(true);
    });
  });

  describe("isTutorialComplete", () => {
    it("returns false for a new tutorial", () => {
      expect(isTutorialComplete(initialTutorialState())).toBe(false);
    });

    it("returns false mid-tutorial", () => {
      const midState = { currentStep: "plant" as const, completed: false };
      expect(isTutorialComplete(midState)).toBe(false);
    });

    it("returns true after skip", () => {
      expect(isTutorialComplete(skipTutorial(initialTutorialState()))).toBe(true);
    });

    it("returns true after completing all steps", () => {
      let state = initialTutorialState();
      for (const step of TUTORIAL_STEPS) {
        state = tickTutorial(state, step.signal);
      }
      expect(isTutorialComplete(state)).toBe(true);
    });
  });

  describe("TUTORIAL_STEPS", () => {
    it("has exactly 11 steps", () => {
      expect(TUTORIAL_STEPS).toHaveLength(11);
    });

    it("all step signals are unique", () => {
      const signals = TUTORIAL_STEPS.map((s) => s.signal);
      const unique = new Set(signals);
      expect(unique.size).toBe(TUTORIAL_STEPS.length);
    });

    it("all steps have non-empty labels", () => {
      for (const step of TUTORIAL_STEPS) {
        expect(step.label.length).toBeGreaterThan(0);
      }
    });
  });
});
