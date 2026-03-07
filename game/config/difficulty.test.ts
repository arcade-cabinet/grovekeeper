/**
 * Tests for difficulty config loader (Spec §37).
 */

import { DIFFICULTIES, getDifficultyById, isExplorationMode } from "@/game/config/difficulty";

describe("difficulty config (Spec §37)", () => {
  describe("DIFFICULTIES", () => {
    it("loads all 5 difficulty entries", () => {
      expect(DIFFICULTIES).toHaveLength(5);
    });

    it("includes explore, normal, hard, brutal, ultra-brutal", () => {
      const ids = DIFFICULTIES.map((d) => d.id);
      expect(ids).toContain("explore");
      expect(ids).toContain("normal");
      expect(ids).toContain("hard");
      expect(ids).toContain("brutal");
      expect(ids).toContain("ultra-brutal");
    });

    it("explore has affectsGameplay: false", () => {
      const explore = DIFFICULTIES.find((d) => d.id === "explore");
      expect(explore?.affectsGameplay).toBe(false);
    });

    it("survival modes all have affectsGameplay: true", () => {
      const survivalIds = ["normal", "hard", "brutal", "ultra-brutal"];
      for (const id of survivalIds) {
        const d = DIFFICULTIES.find((config) => config.id === id);
        expect(d?.affectsGameplay).toBe(true);
      }
    });

    it("explore has staminaDrainMult of 0", () => {
      const explore = DIFFICULTIES.find((d) => d.id === "explore");
      expect(explore?.staminaDrainMult).toBe(0);
    });
  });

  describe("getDifficultyById", () => {
    it("returns the correct config for a valid id", () => {
      const config = getDifficultyById("normal");
      expect(config).toBeDefined();
      expect(config?.id).toBe("normal");
      expect(config?.name).toBe("Normal");
    });

    it("returns undefined for an unknown id", () => {
      expect(getDifficultyById("unknown")).toBeUndefined();
    });

    it("returns explore config", () => {
      const config = getDifficultyById("explore");
      expect(config?.affectsGameplay).toBe(false);
    });
  });

  describe("isExplorationMode (Spec §37.1)", () => {
    it("returns true for explore difficulty", () => {
      expect(isExplorationMode("explore")).toBe(true);
    });

    it("returns false for normal difficulty", () => {
      expect(isExplorationMode("normal")).toBe(false);
    });

    it("returns false for hard difficulty", () => {
      expect(isExplorationMode("hard")).toBe(false);
    });

    it("returns false for brutal difficulty", () => {
      expect(isExplorationMode("brutal")).toBe(false);
    });

    it("returns false for ultra-brutal difficulty", () => {
      expect(isExplorationMode("ultra-brutal")).toBe(false);
    });

    it("returns false for unknown difficulty (safe default)", () => {
      expect(isExplorationMode("nonexistent")).toBe(false);
    });
  });
});
