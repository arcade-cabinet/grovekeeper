/**
 * World Quest System Tests (Spec §30)
 *
 * Validates: 8 templates, 6 slots x 3 options = 729 combos, seed determinism,
 * unlock distance gating, spirit prerequisite gating.
 */

import {
  TOTAL_WORLD_QUESTS,
  VARIANT_SLOTS_COUNT,
  VARIANT_OPTIONS_COUNT,
  TOTAL_VARIANT_COMBINATIONS,
  getAllWorldQuestTemplates,
  getWorldQuestTemplate,
  resolveVariantSelections,
  resolveWorldQuest,
  isWorldQuestUnlocked,
  getUnlockedWorldQuests,
} from "./worldQuestSystem";

describe("World Quest System (Spec §30)", () => {
  // -- Template structure --

  describe("template structure", () => {
    it("has exactly 8 world quest templates", () => {
      expect(getAllWorldQuestTemplates()).toHaveLength(TOTAL_WORLD_QUESTS);
    });

    it("TOTAL_VARIANT_COMBINATIONS is 3^6 = 729", () => {
      expect(TOTAL_VARIANT_COMBINATIONS).toBe(729);
    });

    it("each template has exactly 6 variant slots", () => {
      for (const t of getAllWorldQuestTemplates()) {
        expect(t.variantSlots).toHaveLength(VARIANT_SLOTS_COUNT);
      }
    });

    it("each variant slot has exactly 3 options", () => {
      for (const t of getAllWorldQuestTemplates()) {
        for (const slot of t.variantSlots) {
          expect(slot.options).toHaveLength(VARIANT_OPTIONS_COUNT);
        }
      }
    });

    it("each template has at least 3 steps", () => {
      for (const t of getAllWorldQuestTemplates()) {
        expect(t.steps.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("templates are ordered by unlockDistanceChunks ascending", () => {
      const templates = getAllWorldQuestTemplates();
      for (let i = 1; i < templates.length; i++) {
        expect(templates[i].unlockDistanceChunks).toBeGreaterThanOrEqual(
          templates[i - 1].unlockDistanceChunks,
        );
      }
    });

    it("the final quest requires 8 spirits", () => {
      const final = getWorldQuestTemplate("worldroots-dream");
      expect(final?.prerequisiteSpirits).toBe(8);
    });

    it("each template has a non-empty involvedNpcIds list", () => {
      for (const t of getAllWorldQuestTemplates()) {
        expect(t.involvedNpcIds.length).toBeGreaterThan(0);
      }
    });

    it("all variant option ids are non-empty strings", () => {
      for (const t of getAllWorldQuestTemplates()) {
        for (const slot of t.variantSlots) {
          for (const opt of slot.options) {
            expect(typeof opt.optionId).toBe("string");
            expect(opt.optionId.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  // -- resolveVariantSelections --

  describe("resolveVariantSelections", () => {
    it("returns an array of exactly 6 values", () => {
      const sels = resolveVariantSelections("withered-road", "TestSeed");
      expect(sels).toHaveLength(VARIANT_SLOTS_COUNT);
    });

    it("each selection is an integer in [0, 2]", () => {
      const sels = resolveVariantSelections("withered-road", "TestSeed");
      for (const s of sels) {
        expect(Number.isInteger(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(VARIANT_OPTIONS_COUNT - 1);
      }
    });

    it("same template + same seed → identical selections (deterministic)", () => {
      const s1 = resolveVariantSelections("withered-road", "MySeed");
      const s2 = resolveVariantSelections("withered-road", "MySeed");
      expect(s1).toEqual(s2);
    });

    it("same template + different seeds → different selections", () => {
      const s1 = resolveVariantSelections("withered-road", "SeedAlpha");
      const s2 = resolveVariantSelections("withered-road", "SeedBeta");
      expect(s1).not.toEqual(s2);
    });

    it("different templates + same seed → different selections", () => {
      const s1 = resolveVariantSelections("withered-road", "SharedSeed");
      const s2 = resolveVariantSelections("lost-village", "SharedSeed");
      expect(s1).not.toEqual(s2);
    });

    it("works for all 8 templates without error", () => {
      for (const t of getAllWorldQuestTemplates()) {
        expect(() => resolveVariantSelections(t.id, "AnyTestSeed")).not.toThrow();
      }
    });
  });

  // -- resolveWorldQuest --

  describe("resolveWorldQuest", () => {
    it("returns null for an unknown template id", () => {
      expect(resolveWorldQuest("nonexistent-quest", "seed")).toBeNull();
    });

    it("returns a resolved quest for a valid template", () => {
      const q = resolveWorldQuest("withered-road", "TestSeed");
      expect(q).not.toBeNull();
      expect(q!.templateId).toBe("withered-road");
    });

    it("resolved quest has exactly 6 variant selections", () => {
      const q = resolveWorldQuest("withered-road", "TestSeed");
      expect(q!.variantSelections).toHaveLength(VARIANT_SLOTS_COUNT);
    });

    it("resolved quest steps all have valid targetType and positive targetAmount", () => {
      for (const t of getAllWorldQuestTemplates()) {
        const q = resolveWorldQuest(t.id, "TestSeed");
        expect(q).not.toBeNull();
        for (const step of q!.steps) {
          expect(typeof step.targetType).toBe("string");
          expect(step.targetType.length).toBeGreaterThan(0);
          expect(step.targetAmount).toBeGreaterThan(0);
        }
      }
    });

    it("resolved quest steps have non-empty npcId and dialogueId", () => {
      const q = resolveWorldQuest("withered-road", "TestSeed");
      for (const step of q!.steps) {
        expect(step.npcId.length).toBeGreaterThan(0);
        expect(step.dialogueId.length).toBeGreaterThan(0);
      }
    });

    it("same seed → identical resolved quest (stable output)", () => {
      const q1 = resolveWorldQuest("withered-road", "StableSeed");
      const q2 = resolveWorldQuest("withered-road", "StableSeed");
      expect(q1).toEqual(q2);
    });

    it("different seeds → different variant selections", () => {
      const q1 = resolveWorldQuest("withered-road", "SeedA");
      const q2 = resolveWorldQuest("withered-road", "SeedB");
      expect(q1!.variantSelections).not.toEqual(q2!.variantSelections);
    });

    it("resolved reward xp is at least the template base reward", () => {
      const q = resolveWorldQuest("withered-road", "TestSeed");
      expect(q!.reward.xp).toBeGreaterThanOrEqual(300);
    });

    it("worldroots-dream resolved quest preserves prerequisiteSpirits = 8", () => {
      const q = resolveWorldQuest("worldroots-dream", "TestSeed");
      expect(q!.prerequisiteSpirits).toBe(8);
    });
  });

  // -- isWorldQuestUnlocked --

  describe("isWorldQuestUnlocked", () => {
    it("returns false when maxChunkDistance < unlockDistanceChunks", () => {
      expect(isWorldQuestUnlocked("withered-road", 4)).toBe(false);
    });

    it("returns true when maxChunkDistance equals unlockDistanceChunks", () => {
      expect(isWorldQuestUnlocked("withered-road", 5)).toBe(true);
    });

    it("returns true when maxChunkDistance exceeds unlockDistanceChunks", () => {
      expect(isWorldQuestUnlocked("withered-road", 100)).toBe(true);
    });

    it("returns false for unknown template id", () => {
      expect(isWorldQuestUnlocked("unknown-quest", 100)).toBe(false);
    });

    it("worldroots-dream: locked when distance < 50", () => {
      expect(isWorldQuestUnlocked("worldroots-dream", 49, 8)).toBe(false);
    });

    it("worldroots-dream: locked when spirits < 8, even at dist 50", () => {
      expect(isWorldQuestUnlocked("worldroots-dream", 50, 7)).toBe(false);
    });

    it("worldroots-dream: unlocked only when dist >= 50 AND spirits >= 8", () => {
      expect(isWorldQuestUnlocked("worldroots-dream", 50, 8)).toBe(true);
    });

    it("non-spirit quests are not gated by spirit count", () => {
      // withered-road has prerequisiteSpirits = 0
      expect(isWorldQuestUnlocked("withered-road", 5, 0)).toBe(true);
    });
  });

  // -- getUnlockedWorldQuests --

  describe("getUnlockedWorldQuests", () => {
    it("returns empty array at distance 0", () => {
      const quests = getUnlockedWorldQuests("seed", 0);
      expect(quests).toHaveLength(0);
    });

    it("returns withered-road at distance 5", () => {
      const quests = getUnlockedWorldQuests("seed", 5);
      expect(quests.some((q) => q.templateId === "withered-road")).toBe(true);
    });

    it("does not return worldroots-dream without 8 spirits", () => {
      const quests = getUnlockedWorldQuests("seed", 100, 0);
      expect(quests.some((q) => q.templateId === "worldroots-dream")).toBe(false);
    });

    it("returns worldroots-dream with dist 50 and 8 spirits", () => {
      const quests = getUnlockedWorldQuests("seed", 50, 8);
      expect(quests.some((q) => q.templateId === "worldroots-dream")).toBe(true);
    });

    it("all returned quests have valid step structure", () => {
      const quests = getUnlockedWorldQuests("TestSeed", 100, 8);
      for (const q of quests) {
        expect(q.variantSelections).toHaveLength(VARIANT_SLOTS_COUNT);
        for (const step of q.steps) {
          expect(step.targetAmount).toBeGreaterThan(0);
          expect(step.targetType.length).toBeGreaterThan(0);
        }
      }
    });

    it("returns all 8 quests at max exploration with 8 spirits", () => {
      const quests = getUnlockedWorldQuests("FullSeed", 100, 8);
      expect(quests).toHaveLength(TOTAL_WORLD_QUESTS);
    });

    it("same seed → same resolved quests (stable ordering)", () => {
      const q1 = getUnlockedWorldQuests("StableSeed", 100, 8);
      const q2 = getUnlockedWorldQuests("StableSeed", 100, 8);
      expect(q1).toEqual(q2);
    });
  });
});
