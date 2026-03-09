/**
 * Onboarding bridge tests — Spec §25.1
 *
 * The overlay tutorial has been retired and replaced by the elder-awakening
 * quest chain. These tests verify the new behaviour: tutorial state is always
 * complete, tickTutorial is a no-op, and ONBOARDING_SIGNAL_MAP correctly maps
 * action signals to quest objective event types.
 */

import {
  advanceStep,
  currentStepDef,
  currentStepLabel,
  initialTutorialState,
  isTutorialComplete,
  ONBOARDING_SIGNAL_MAP,
  skipTutorial,
  TUTORIAL_STEPS,
  tickTutorial,
} from "./tutorial.ts";

describe("Onboarding bridge (Spec §25.1)", () => {
  describe("initialTutorialState", () => {
    it("returns step 'done' and completed:true — overlay tutorial is retired", () => {
      const state = initialTutorialState();
      expect(state.currentStep).toBe("done");
      expect(state.completed).toBe(true);
    });
  });

  describe("TUTORIAL_STEPS", () => {
    it("is empty — no overlay steps remain", () => {
      expect(TUTORIAL_STEPS).toHaveLength(0);
    });
  });

  describe("currentStepDef", () => {
    it("always returns null — overlay is retired", () => {
      expect(currentStepDef(initialTutorialState())).toBeNull();
    });
  });

  describe("currentStepLabel", () => {
    it("always returns null — overlay is retired", () => {
      expect(currentStepLabel(initialTutorialState())).toBeNull();
    });
  });

  describe("isTutorialComplete", () => {
    it("always returns true — overlay tutorial is perpetually complete", () => {
      expect(isTutorialComplete(initialTutorialState())).toBe(true);
    });
  });

  describe("tickTutorial", () => {
    it("is a no-op — returns same state reference for any signal", () => {
      const state = initialTutorialState();
      const next = tickTutorial(state, "action:plant");
      expect(next).toBe(state);
    });

    it("is a no-op for unknown signals", () => {
      const state = initialTutorialState();
      const next = tickTutorial(state, "action:look");
      expect(next).toBe(state);
    });
  });

  describe("advanceStep", () => {
    it("is a no-op — returns same state reference", () => {
      const state = initialTutorialState();
      expect(advanceStep(state)).toBe(state);
    });
  });

  describe("skipTutorial", () => {
    it("is a no-op — returns same state reference", () => {
      const state = initialTutorialState();
      expect(skipTutorial(state)).toBe(state);
    });
  });

  describe("ONBOARDING_SIGNAL_MAP", () => {
    it("maps action:plant to trees_planted", () => {
      expect(ONBOARDING_SIGNAL_MAP["action:plant"]).toBe("trees_planted");
    });

    it("maps action:harvest to trees_harvested", () => {
      expect(ONBOARDING_SIGNAL_MAP["action:harvest"]).toBe("trees_harvested");
    });

    it("maps action:water to trees_watered", () => {
      expect(ONBOARDING_SIGNAL_MAP["action:water"]).toBe("trees_watered");
    });

    it("does not map overlay-only signals like action:look", () => {
      expect(ONBOARDING_SIGNAL_MAP["action:look"]).toBeUndefined();
    });

    it("does not map action:move", () => {
      expect(ONBOARDING_SIGNAL_MAP["action:move"]).toBeUndefined();
    });

    it("does not map action:equip", () => {
      expect(ONBOARDING_SIGNAL_MAP["action:equip"]).toBeUndefined();
    });
  });
});
