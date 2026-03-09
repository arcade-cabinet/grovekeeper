/**
 * Procedural Quest Generation (Spec §14.3)
 *
 * Generates 1–4 quests per chunk using seeded context.
 * Templates: gather | plant | explore | deliver | build | discover
 *
 * Determinism guarantee: same worldSeed + (chunkX, chunkZ) = same quests.
 * RNG uniformity: every buildQuestContext call consumes exactly 3 values
 * (npcRoll, targetRoll, amountRoll) regardless of category.
 *
 * All tuning values are in config/game/proceduralQuests.json.
 */

import rawConfig from "@/config/game/proceduralQuests.json" with { type: "json" };
import { scopedRNG } from "@/game/utils/seedWords";
import { createQuest, type Quest, type QuestDef } from "./questEngine.ts";

// -- Types --

export type ProceduralQuestCategory =
  | "gather"
  | "plant"
  | "explore"
  | "deliver"
  | "build"
  | "discover";

export interface ProceduralQuestContext {
  category: ProceduralQuestCategory;
  npcId: string;
  targetType: string;
  targetAmount: number;
  locationLabel: string;
  chunkX: number;
  chunkZ: number;
}

export interface ProceduralQuest {
  context: ProceduralQuestContext;
  quest: Quest;
}

// -- Config types --

interface AmountRange {
  min: number;
  max: number;
}

interface AmountFixed {
  fixed: number;
}

interface ProceduralQuestConfig {
  questsPerChunk: { min: number; max: number };
  categories: ProceduralQuestCategory[];
  npcIds: string[];
  resources: string[];
  species: string[];
  structures: string[];
  landmarks: string[];
  amounts: {
    gather: AmountRange;
    plant: AmountRange;
    explore: AmountFixed;
    deliver: AmountRange;
    build: AmountRange;
    discover: AmountFixed;
  };
  rewards: Record<ProceduralQuestCategory, { xp: number }>;
}

const cfg = rawConfig as ProceduralQuestConfig;

// -- Helpers --

function pickFromPool<T>(pool: T[], roll: number): T {
  return pool[Math.floor(roll * pool.length)];
}

function pickFromRange(spec: AmountRange, roll: number): number {
  return spec.min + Math.floor(roll * (spec.max - spec.min + 1));
}

// -- Context builder --

/**
 * Build a procedural quest context for a given category.
 * Always consumes exactly 3 RNG values (npcRoll, targetRoll, amountRoll)
 * regardless of category, ensuring the PRNG stream advances uniformly.
 */
export function buildQuestContext(
  category: ProceduralQuestCategory,
  rng: () => number,
  chunkX: number,
  chunkZ: number,
): ProceduralQuestContext {
  const npcRoll = rng();
  const targetRoll = rng();
  const amountRoll = rng();

  const npcId = pickFromPool(cfg.npcIds, npcRoll);
  let targetType: string;
  let targetAmount: number;

  if (category === "gather" || category === "deliver") {
    targetType = pickFromPool(cfg.resources, targetRoll);
    targetAmount = pickFromRange(cfg.amounts.gather, amountRoll);
  } else if (category === "plant") {
    targetType = pickFromPool(cfg.species, targetRoll);
    targetAmount = pickFromRange(cfg.amounts.plant, amountRoll);
  } else if (category === "explore") {
    // targetRoll and amountRoll consumed but unused — fixed values
    void targetRoll;
    void amountRoll;
    targetType = "chunk";
    targetAmount = cfg.amounts.explore.fixed;
  } else if (category === "build") {
    targetType = pickFromPool(cfg.structures, targetRoll);
    targetAmount = pickFromRange(cfg.amounts.build, amountRoll);
  } else {
    // discover — amountRoll consumed but unused — fixed value
    void amountRoll;
    targetType = pickFromPool(cfg.landmarks, targetRoll);
    targetAmount = cfg.amounts.discover.fixed;
  }

  return {
    category,
    npcId,
    targetType,
    targetAmount,
    locationLabel: `chunk (${chunkX}, ${chunkZ})`,
    chunkX,
    chunkZ,
  };
}

// -- QuestDef builder --

/**
 * Build a QuestDef from a procedural quest context.
 * The index differentiates multiple quests generated for the same chunk.
 */
export function buildQuestDef(ctx: ProceduralQuestContext, index: number): QuestDef {
  const base = `procedural-${ctx.chunkX}-${ctx.chunkZ}-${index}`;

  switch (ctx.category) {
    case "gather":
      return {
        id: `${base}-gather-${ctx.targetType}`,
        title: `Gather ${ctx.targetAmount} ${ctx.targetType}`,
        description: `${ctx.npcId} needs ${ctx.targetAmount} ${ctx.targetType} from the forest near ${ctx.locationLabel}.`,
        steps: [
          {
            id: "gather-resources",
            objectiveText: `Gather ${ctx.targetAmount} ${ctx.targetType} (0/${ctx.targetAmount})`,
            targetType: `gather_${ctx.targetType}`,
            targetAmount: ctx.targetAmount,
          },
        ],
      };

    case "plant":
      return {
        id: `${base}-plant-${ctx.targetType}`,
        title: `Plant ${ctx.targetAmount} ${ctx.targetType} trees`,
        description: `Help the grove grow by planting ${ctx.targetAmount} ${ctx.targetType} trees near ${ctx.locationLabel}.`,
        steps: [
          {
            id: "plant-trees",
            objectiveText: `Plant ${ctx.targetAmount} ${ctx.targetType} trees (0/${ctx.targetAmount})`,
            targetType: `plant_${ctx.targetType}`,
            targetAmount: ctx.targetAmount,
          },
        ],
      };

    case "explore":
      return {
        id: `${base}-explore`,
        title: `Explore ${ctx.locationLabel}`,
        description: `Venture into the unknown territory at ${ctx.locationLabel}.`,
        steps: [
          {
            id: "explore-chunk",
            objectiveText: `Reach ${ctx.locationLabel}`,
            targetType: "explore_chunk",
            targetAmount: 1,
          },
        ],
      };

    case "deliver":
      return {
        id: `${base}-deliver-${ctx.targetType}`,
        title: `Deliver ${ctx.targetAmount} ${ctx.targetType}`,
        description: `${ctx.npcId} is waiting for ${ctx.targetAmount} ${ctx.targetType} at ${ctx.locationLabel}.`,
        steps: [
          {
            id: "gather-for-delivery",
            objectiveText: `Gather ${ctx.targetAmount} ${ctx.targetType} (0/${ctx.targetAmount})`,
            targetType: `gather_${ctx.targetType}`,
            targetAmount: ctx.targetAmount,
          },
          {
            id: "deliver-to-npc",
            objectiveText: `Deliver to ${ctx.npcId}`,
            targetType: `deliver_to_${ctx.npcId}`,
            targetAmount: 1,
          },
        ],
      };

    case "build":
      return {
        id: `${base}-build-${ctx.targetType}`,
        title: `Build ${ctx.targetAmount} ${ctx.targetType}`,
        description: `Construct ${ctx.targetAmount} ${ctx.targetType} at ${ctx.locationLabel}.`,
        steps: [
          {
            id: "build-structure",
            objectiveText: `Build ${ctx.targetAmount} ${ctx.targetType} (0/${ctx.targetAmount})`,
            targetType: `build_${ctx.targetType}`,
            targetAmount: ctx.targetAmount,
          },
        ],
      };

    case "discover":
      return {
        id: `${base}-discover-${ctx.targetType}`,
        title: `Discover the ${ctx.targetType}`,
        description: `Find the hidden ${ctx.targetType} somewhere near ${ctx.locationLabel}.`,
        steps: [
          {
            id: "discover-landmark",
            objectiveText: `Find the ${ctx.targetType}`,
            targetType: `discover_${ctx.targetType}`,
            targetAmount: 1,
          },
        ],
      };
  }
}

// -- Main export --

/**
 * Generate 1–4 procedural quests for a chunk.
 * Deterministic: same worldSeed + (chunkX, chunkZ) = same quests every time.
 *
 * Each quest is created via the quest state machine (state: "available").
 * Use startQuest() from questEngine to begin tracking progress.
 */
export function generateChunkQuests(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): ProceduralQuest[] {
  const rng = scopedRNG("procedural-quest", worldSeed, chunkX, chunkZ);

  const countRoll = rng();
  const { min, max } = cfg.questsPerChunk;
  const count = min + Math.floor(countRoll * (max - min + 1));

  const quests: ProceduralQuest[] = [];

  for (let i = 0; i < count; i++) {
    const categoryRoll = rng();
    const category = pickFromPool(cfg.categories, categoryRoll);
    const context = buildQuestContext(category, rng, chunkX, chunkZ);
    const def = buildQuestDef(context, i);
    quests.push({ context, quest: createQuest(def) });
  }

  return quests;
}
