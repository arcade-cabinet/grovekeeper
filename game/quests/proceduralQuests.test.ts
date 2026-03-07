/**
 * Procedural Quest Generation Tests (Spec §14.3)
 *
 * Validates: 6 template categories, seeded context (target, NPC, location),
 * determinism per chunk, and quest state machine integration.
 */

import proceduralQuestsConfig from "@/config/game/proceduralQuests.json" with { type: "json" };
import {
  buildQuestContext,
  buildQuestDef,
  generateChunkQuests,
  type ProceduralQuestCategory,
} from "./proceduralQuests.ts";

// Controlled RNG: returns values in sequence, wrapping at end.
function makeRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

const ALL_CATEGORIES: ProceduralQuestCategory[] = [
  "gather",
  "plant",
  "explore",
  "deliver",
  "build",
  "discover",
];

describe("Procedural Quest Generation (Spec §14.3)", () => {
  // -- generateChunkQuests integration --

  describe("generateChunkQuests", () => {
    it("returns between 1 and 4 quests per chunk", () => {
      // Run several seeds and verify counts are always in range
      const seeds = ["Gentle Mossy Oak", "Ancient Deep Fern", "Silver Mossy Brook"];
      for (const seed of seeds) {
        const quests = generateChunkQuests(seed, 3, 7);
        expect(quests.length).toBeGreaterThanOrEqual(1);
        expect(quests.length).toBeLessThanOrEqual(4);
      }
    });

    it("is deterministic — same seed and chunk always yields the same quests", () => {
      const seed = "Gentle Mossy Oak";
      const first = generateChunkQuests(seed, 5, 5);
      const second = generateChunkQuests(seed, 5, 5);
      expect(second).toEqual(first);
    });

    it("produces different quests for different chunks", () => {
      const seed = "Gentle Mossy Oak";
      const chunkA = generateChunkQuests(seed, 0, 0);
      const chunkB = generateChunkQuests(seed, 10, 10);
      // Different chunks should not produce identical quest id sets
      const idsA = chunkA.map((q) => q.quest.id).join(",");
      const idsB = chunkB.map((q) => q.quest.id).join(",");
      expect(idsA).not.toBe(idsB);
    });

    it("each quest starts in 'available' state", () => {
      const quests = generateChunkQuests("Ancient Deep Fern", 2, 4);
      for (const { quest } of quests) {
        expect(quest.state).toBe("available");
      }
    });

    it("quest IDs are unique within a chunk", () => {
      const quests = generateChunkQuests("Silver Mossy Brook", 7, 3);
      const ids = quests.map((q) => q.quest.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("each context has a category from the 6 valid templates", () => {
      const quests = generateChunkQuests("Gentle Mossy Oak", 1, 1);
      for (const { context } of quests) {
        expect(ALL_CATEGORIES).toContain(context.category);
      }
    });

    it("all 6 categories appear across many chunks", () => {
      const seen = new Set<string>();
      const seed = "Ancient Deep Fern";
      for (let x = 0; x < 50 && seen.size < 6; x++) {
        const quests = generateChunkQuests(seed, x, x);
        for (const { context } of quests) seen.add(context.category);
      }
      expect(seen.size).toBe(6);
    });

    it("context includes chunk coordinates and locationLabel", () => {
      const quests = generateChunkQuests("Gentle Mossy Oak", 5, 9);
      for (const { context } of quests) {
        expect(context.chunkX).toBe(5);
        expect(context.chunkZ).toBe(9);
        expect(context.locationLabel).toContain("5");
        expect(context.locationLabel).toContain("9");
      }
    });

    it("context npcId is from the configured NPC pool", () => {
      const quests = generateChunkQuests("Silver Mossy Brook", 3, 6);
      const npcIds: string[] = proceduralQuestsConfig.npcIds;
      for (const { context } of quests) {
        expect(npcIds).toContain(context.npcId);
      }
    });
  });

  // -- buildQuestContext per-category unit tests --

  describe("buildQuestContext — gather", () => {
    it("picks targetType from resources pool", () => {
      const resources: string[] = proceduralQuestsConfig.resources;
      const ctx = buildQuestContext("gather", makeRng([0, 0, 0]), 0, 0);
      expect(resources).toContain(ctx.targetType);
    });

    it("targetAmount is within gather range [5, 20]", () => {
      const ctx = buildQuestContext("gather", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.targetAmount).toBeGreaterThanOrEqual(5);
      expect(ctx.targetAmount).toBeLessThanOrEqual(20);
    });

    it("picks npcId from NPC pool", () => {
      const npcIds: string[] = proceduralQuestsConfig.npcIds;
      const ctx = buildQuestContext("gather", makeRng([0, 0, 0]), 0, 0);
      expect(npcIds).toContain(ctx.npcId);
    });

    it("sets category to gather", () => {
      const ctx = buildQuestContext("gather", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.category).toBe("gather");
    });
  });

  describe("buildQuestContext — plant", () => {
    it("picks targetType from species pool", () => {
      const species: string[] = proceduralQuestsConfig.species;
      const ctx = buildQuestContext("plant", makeRng([0, 0, 0]), 0, 0);
      expect(species).toContain(ctx.targetType);
    });

    it("targetAmount is within plant range [3, 10]", () => {
      const ctx = buildQuestContext("plant", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.targetAmount).toBeGreaterThanOrEqual(3);
      expect(ctx.targetAmount).toBeLessThanOrEqual(10);
    });

    it("sets category to plant", () => {
      const ctx = buildQuestContext("plant", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.category).toBe("plant");
    });
  });

  describe("buildQuestContext — explore", () => {
    it("targetType is 'chunk'", () => {
      const ctx = buildQuestContext("explore", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.targetType).toBe("chunk");
    });

    it("targetAmount is 1 (fixed)", () => {
      const ctx = buildQuestContext("explore", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.targetAmount).toBe(1);
    });

    it("sets category to explore", () => {
      const ctx = buildQuestContext("explore", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.category).toBe("explore");
    });
  });

  describe("buildQuestContext — deliver", () => {
    it("picks targetType from resources pool", () => {
      const resources: string[] = proceduralQuestsConfig.resources;
      const ctx = buildQuestContext("deliver", makeRng([0, 0, 0]), 0, 0);
      expect(resources).toContain(ctx.targetType);
    });

    it("targetAmount is within deliver range [5, 20]", () => {
      const ctx = buildQuestContext("deliver", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.targetAmount).toBeGreaterThanOrEqual(5);
      expect(ctx.targetAmount).toBeLessThanOrEqual(20);
    });

    it("sets category to deliver", () => {
      const ctx = buildQuestContext("deliver", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.category).toBe("deliver");
    });
  });

  describe("buildQuestContext — build", () => {
    it("picks targetType from structures pool", () => {
      const structures: string[] = proceduralQuestsConfig.structures;
      const ctx = buildQuestContext("build", makeRng([0, 0, 0]), 0, 0);
      expect(structures).toContain(ctx.targetType);
    });

    it("targetAmount is within build range [1, 3]", () => {
      const ctx = buildQuestContext("build", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.targetAmount).toBeGreaterThanOrEqual(1);
      expect(ctx.targetAmount).toBeLessThanOrEqual(3);
    });

    it("sets category to build", () => {
      const ctx = buildQuestContext("build", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.category).toBe("build");
    });
  });

  describe("buildQuestContext — discover", () => {
    it("picks targetType from landmarks pool", () => {
      const landmarks: string[] = proceduralQuestsConfig.landmarks;
      const ctx = buildQuestContext("discover", makeRng([0, 0, 0]), 0, 0);
      expect(landmarks).toContain(ctx.targetType);
    });

    it("targetAmount is 1 (fixed)", () => {
      const ctx = buildQuestContext("discover", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.targetAmount).toBe(1);
    });

    it("sets category to discover", () => {
      const ctx = buildQuestContext("discover", makeRng([0, 0, 0]), 0, 0);
      expect(ctx.category).toBe("discover");
    });
  });

  // -- buildQuestDef structure tests --

  describe("buildQuestDef", () => {
    it("includes chunk coords and index in the quest id for uniqueness", () => {
      const ctx = buildQuestContext("gather", makeRng([0, 0, 0]), 3, 7);
      const def = buildQuestDef(ctx, 0);
      expect(def.id).toContain("3");
      expect(def.id).toContain("7");
      expect(def.id).toContain("0");
    });

    it("two quests in same chunk with different indices have different ids", () => {
      const ctx = buildQuestContext("plant", makeRng([0, 0, 0]), 5, 5);
      const def0 = buildQuestDef(ctx, 0);
      const def1 = buildQuestDef(ctx, 1);
      expect(def0.id).not.toBe(def1.id);
    });

    it("gather quest has 1 step with gather targetType", () => {
      const ctx = buildQuestContext("gather", makeRng([0, 0, 0]), 0, 0);
      const def = buildQuestDef(ctx, 0);
      expect(def.steps).toHaveLength(1);
      expect(def.steps[0].targetType).toMatch(/^gather_/);
    });

    it("plant quest has 1 step with plant targetType", () => {
      const ctx = buildQuestContext("plant", makeRng([0, 0, 0]), 0, 0);
      const def = buildQuestDef(ctx, 0);
      expect(def.steps).toHaveLength(1);
      expect(def.steps[0].targetType).toMatch(/^plant_/);
    });

    it("explore quest has 1 step with explore_chunk targetType", () => {
      const ctx = buildQuestContext("explore", makeRng([0, 0, 0]), 0, 0);
      const def = buildQuestDef(ctx, 0);
      expect(def.steps).toHaveLength(1);
      expect(def.steps[0].targetType).toBe("explore_chunk");
    });

    it("deliver quest has 2 steps (gather then deliver)", () => {
      const ctx = buildQuestContext("deliver", makeRng([0, 0, 0]), 0, 0);
      const def = buildQuestDef(ctx, 0);
      expect(def.steps).toHaveLength(2);
      expect(def.steps[0].targetType).toMatch(/^gather_/);
      expect(def.steps[1].targetType).toMatch(/^deliver_to_/);
    });

    it("build quest has 1 step with build targetType", () => {
      const ctx = buildQuestContext("build", makeRng([0, 0, 0]), 0, 0);
      const def = buildQuestDef(ctx, 0);
      expect(def.steps).toHaveLength(1);
      expect(def.steps[0].targetType).toMatch(/^build_/);
    });

    it("discover quest has 1 step with discover targetType", () => {
      const ctx = buildQuestContext("discover", makeRng([0, 0, 0]), 0, 0);
      const def = buildQuestDef(ctx, 0);
      expect(def.steps).toHaveLength(1);
      expect(def.steps[0].targetType).toMatch(/^discover_/);
    });

    it("all quest defs have non-empty title and description", () => {
      for (const category of ALL_CATEGORIES) {
        const ctx = buildQuestContext(category, makeRng([0, 0, 0]), 1, 1);
        const def = buildQuestDef(ctx, 0);
        expect(def.title.length).toBeGreaterThan(0);
        expect(def.description.length).toBeGreaterThan(0);
      }
    });
  });
});
