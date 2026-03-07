/**
 * Tests for difficulty config loader (Spec §37).
 */

import { DIFFICULTIES, getDifficultyById, isExplorationMode } from "@/game/config/difficulty";

describe("difficulty config (Spec §37)", () => {
  describe("DIFFICULTIES", () => {
    it("loads all 4 difficulty entries", () => {
      expect(DIFFICULTIES).toHaveLength(4);
    });

    it("includes seedling, sapling, hardwood, ironwood", () => {
      const ids = DIFFICULTIES.map((d) => d.id);
      expect(ids).toContain("seedling");
      expect(ids).toContain("sapling");
      expect(ids).toContain("hardwood");
      expect(ids).toContain("ironwood");
    });

    it("seedling has affectsGameplay: false", () => {
      const seedling = DIFFICULTIES.find((d) => d.id === "seedling");
      expect(seedling?.affectsGameplay).toBe(false);
    });

    it("survival modes all have affectsGameplay: true", () => {
      const survivalIds = ["sapling", "hardwood", "ironwood"];
      for (const id of survivalIds) {
        const d = DIFFICULTIES.find((config) => config.id === id);
        expect(d?.affectsGameplay).toBe(true);
      }
    });

    it("seedling has staminaDrainMult of 0", () => {
      const seedling = DIFFICULTIES.find((d) => d.id === "seedling");
      expect(seedling?.staminaDrainMult).toBe(0);
    });
  });

  describe("getDifficultyById", () => {
    it("returns the correct config for a valid id", () => {
      const config = getDifficultyById("sapling");
      expect(config).toBeDefined();
      expect(config?.id).toBe("sapling");
      expect(config?.name).toBe("Sapling");
    });

    it("returns undefined for an unknown id", () => {
      expect(getDifficultyById("unknown")).toBeUndefined();
    });

    it("returns seedling config", () => {
      const config = getDifficultyById("seedling");
      expect(config?.affectsGameplay).toBe(false);
    });
  });

  describe("isExplorationMode (Spec §37.1)", () => {
    it("returns true for seedling difficulty", () => {
      expect(isExplorationMode("seedling")).toBe(true);
    });

    it("returns false for sapling difficulty", () => {
      expect(isExplorationMode("sapling")).toBe(false);
    });

    it("returns false for hardwood difficulty", () => {
      expect(isExplorationMode("hardwood")).toBe(false);
    });

    it("returns false for ironwood difficulty", () => {
      expect(isExplorationMode("ironwood")).toBe(false);
    });

    it("returns false for unknown difficulty (safe default)", () => {
      expect(isExplorationMode("nonexistent")).toBe(false);
    });
  });
});
