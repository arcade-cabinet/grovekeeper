import { describe, expect, it } from "vitest";
import {
  advanceRegrowthTimers,
  createRegrowthEntry,
  getRegrowthTime,
} from "./wildTreeRegrowth";

describe("wildTreeRegrowth", () => {
  const REGROWTH_TIME = 3 * 24 * 60 * 60; // 259200 seconds

  describe("createRegrowthEntry", () => {
    it("sets correct timer to 3 game-days in seconds", () => {
      const entry = createRegrowthEntry(5, 10, "white-oak");
      expect(entry.timerSeconds).toBe(REGROWTH_TIME);
      expect(entry.worldX).toBe(5);
      expect(entry.worldZ).toBe(10);
      expect(entry.speciesId).toBe("white-oak");
    });
  });

  describe("getRegrowthTime", () => {
    it("returns the regrowth time constant", () => {
      expect(getRegrowthTime()).toBe(REGROWTH_TIME);
    });
  });

  describe("advanceRegrowthTimers", () => {
    it("decrements timer by deltaTime", () => {
      const entry = createRegrowthEntry(0, 0, "elder-pine");
      const { remaining } = advanceRegrowthTimers([entry], 100);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].timerSeconds).toBe(REGROWTH_TIME - 100);
    });

    it("completes entries when timer reaches 0", () => {
      const entry = createRegrowthEntry(0, 0, "white-oak");
      const { completed, remaining } = advanceRegrowthTimers(
        [entry],
        REGROWTH_TIME,
      );
      expect(completed).toHaveLength(1);
      expect(remaining).toHaveLength(0);
      expect(completed[0].speciesId).toBe("white-oak");
    });

    it("completes entries when timer goes below 0", () => {
      const entry = createRegrowthEntry(3, 7, "birch");
      const { completed, remaining } = advanceRegrowthTimers(
        [entry],
        REGROWTH_TIME + 500,
      );
      expect(completed).toHaveLength(1);
      expect(remaining).toHaveLength(0);
      expect(completed[0].timerSeconds).toBeLessThan(0);
    });

    it("handles empty array", () => {
      const { completed, remaining } = advanceRegrowthTimers([], 100);
      expect(completed).toHaveLength(0);
      expect(remaining).toHaveLength(0);
    });

    it("partial advance leaves entries in remaining", () => {
      const entry = createRegrowthEntry(1, 2, "maple");
      const halfTime = REGROWTH_TIME / 2;
      const { completed, remaining } = advanceRegrowthTimers([entry], halfTime);
      expect(completed).toHaveLength(0);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].timerSeconds).toBeCloseTo(REGROWTH_TIME - halfTime);
    });

    it("multiple entries advance independently", () => {
      const entryA = createRegrowthEntry(0, 0, "oak");
      const entryB = {
        ...createRegrowthEntry(5, 5, "pine"),
        timerSeconds: 100,
      };
      const { completed, remaining } = advanceRegrowthTimers(
        [entryA, entryB],
        150,
      );
      // entryA should still be remaining (259200 - 150 > 0)
      // entryB should be completed (100 - 150 = -50 <= 0)
      expect(completed).toHaveLength(1);
      expect(completed[0].speciesId).toBe("pine");
      expect(remaining).toHaveLength(1);
      expect(remaining[0].speciesId).toBe("oak");
    });

    it("does not mutate original entries", () => {
      const entry = createRegrowthEntry(0, 0, "oak");
      const originalTimer = entry.timerSeconds;
      advanceRegrowthTimers([entry], 500);
      expect(entry.timerSeconds).toBe(originalTimer);
    });
  });
});
