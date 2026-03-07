/**
 * Tests for LoadingScreen pure logic (Spec §1.3).
 *
 * Imports from loadingScreenLogic.ts (plain .ts) to avoid triggering the
 * react-native-css-interop JSX runtime crash in Jest.
 */

import {
  getPhaseLabel,
  getProgressPercent,
  getTip,
  LOADING_TIPS,
  tipCount,
} from "./loadingScreenLogic.ts";

describe("LoadingScreen logic (Spec §1.3)", () => {
  describe("getPhaseLabel", () => {
    it("returns 'Preparing...' for phase 0", () => {
      expect(getPhaseLabel(0)).toBe("Preparing...");
    });

    it("returns 'Loading fonts...' for phase 1", () => {
      expect(getPhaseLabel(1)).toBe("Loading fonts...");
    });

    it("returns 'Initializing grove...' for phase 2 (store init)", () => {
      expect(getPhaseLabel(2)).toBe("Initializing grove...");
    });

    it("returns 'Generating world...' for phase 3 (world gen)", () => {
      expect(getPhaseLabel(3)).toBe("Generating world...");
    });

    it("returns 'Ready!' for phase 4 (first frame)", () => {
      expect(getPhaseLabel(4)).toBe("Ready!");
    });
  });

  describe("getProgressPercent", () => {
    it("returns 0 for phase 0", () => {
      expect(getProgressPercent(0)).toBe(0);
    });

    it("returns 25 for phase 1 (1 of 4 phases done)", () => {
      expect(getProgressPercent(1)).toBe(25);
    });

    it("returns 50 for phase 2", () => {
      expect(getProgressPercent(2)).toBe(50);
    });

    it("returns 75 for phase 3", () => {
      expect(getProgressPercent(3)).toBe(75);
    });

    it("returns 100 for phase 4", () => {
      expect(getProgressPercent(4)).toBe(100);
    });
  });

  describe("getTip", () => {
    it("returns the tip at index 0", () => {
      expect(getTip(0)).toBe(LOADING_TIPS[0]);
    });

    it("returns the tip at index 1", () => {
      expect(getTip(1)).toBe(LOADING_TIPS[1]);
    });

    it("wraps around when index equals tipCount", () => {
      expect(getTip(LOADING_TIPS.length)).toBe(LOADING_TIPS[0]);
    });

    it("wraps around for large indices", () => {
      const len = LOADING_TIPS.length;
      expect(getTip(len * 3 + 2)).toBe(LOADING_TIPS[2]);
    });

    it("is safe with index 0 when tips length is non-zero", () => {
      expect(typeof getTip(0)).toBe("string");
      expect(getTip(0).length).toBeGreaterThan(0);
    });
  });

  describe("tipCount", () => {
    it("matches the LOADING_TIPS array length", () => {
      expect(tipCount()).toBe(LOADING_TIPS.length);
    });

    it("returns at least 5 tips", () => {
      expect(tipCount()).toBeGreaterThanOrEqual(5);
    });
  });

  describe("LOADING_TIPS", () => {
    it("has no empty strings", () => {
      for (const tip of LOADING_TIPS) {
        expect(tip.trim().length).toBeGreaterThan(0);
      }
    });

    it("has no duplicate tips", () => {
      const unique = new Set(LOADING_TIPS);
      expect(unique.size).toBe(LOADING_TIPS.length);
    });
  });
});
