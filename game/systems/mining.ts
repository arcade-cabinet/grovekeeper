/**
 * Mining system — pick tool interaction with RockComponent (Spec §22).
 *
 * Pure functions only — no ECS, Rapier, or R3F imports.
 * Rocks are mined with the pick tool to produce stone or ore
 * depending on the chunk biome. Stamina cost scales with rock hardness.
 */

import miningConfig from "@/config/game/mining.json" with { type: "json" };
import type { RockComponent } from "@/game/ecs/components/terrain";
import type { BiomeType } from "@/game/world/biomeMapper";

// ---------------------------------------------------------------------------
// Ore yield types (loaded from config)
// ---------------------------------------------------------------------------

export interface OreYield {
  oreType: string;
  minAmount: number;
  maxAmount: number;
}

const ORE_TABLE = miningConfig.oreTable as unknown as Record<string, OreYield>;
const HARDNESS_TABLE = miningConfig.rockHardness as unknown as Record<string, number>;

// ---------------------------------------------------------------------------
// Rock hardness — Spec §22: stamina cost scales with hardness
// ---------------------------------------------------------------------------

/**
 * Returns the hardness value for a rock type.
 * Falls back to the "default" hardness (1) for unknown rock types.
 */
export function getRockHardness(rockType: string): number {
  return HARDNESS_TABLE[rockType] ?? HARDNESS_TABLE.default ?? 1;
}

/**
 * Compute the stamina cost to mine one hit of a rock.
 * Spec §22: stamina cost = hardness × baseStaminaPerHardness.
 */
export function computeMiningStaminaCost(rockType: string): number {
  return getRockHardness(rockType) * miningConfig.baseStaminaPerHardness;
}

// ---------------------------------------------------------------------------
// Ore table — Spec §22: ore type determined by biome
// ---------------------------------------------------------------------------

/**
 * Returns the ore yield config for a biome.
 * Falls back to starting-grove if the biome is somehow missing from config.
 */
export function getOreForBiome(biome: BiomeType): OreYield {
  return ORE_TABLE[biome] ?? ORE_TABLE["starting-grove"];
}

// ---------------------------------------------------------------------------
// Mine result — Spec §22: mining produces ore resources
// ---------------------------------------------------------------------------

export interface MineResult {
  /** Resource type produced (e.g. "stone" or "ore"). */
  oreType: string;
  /** Number of units produced. */
  amount: number;
}

/**
 * Mine a rock and return the resource yield.
 *
 * @param rock       The rock ECS component being mined.
 * @param biome      The biome of the chunk containing the rock.
 * @param rngValue   A normalised [0, 1) value from scopedRNG — determines yield
 *                   within [minAmount, maxAmount] inclusive.
 * @returns          The resource type and amount produced.
 *
 * Pure function — does not mutate rock or ECS state.
 * Callers remove the rock entity and credit inventory.
 */
export function mineRock(_rock: RockComponent, biome: BiomeType, rngValue: number): MineResult {
  const oreYield = getOreForBiome(biome);
  const range = oreYield.maxAmount - oreYield.minAmount;
  const amount = Math.min(
    oreYield.maxAmount,
    oreYield.minAmount + Math.floor(rngValue * (range + 1)),
  );
  return { oreType: oreYield.oreType, amount };
}

// ---------------------------------------------------------------------------
// Pick tool check — Spec §22: interact via pick tool
// ---------------------------------------------------------------------------

/**
 * Returns true if the given tool action string corresponds to the pick tool.
 * Tool action "MINE" identifies the pick from tools.json.
 */
export function isPickTool(action: string | undefined): boolean {
  return action === "MINE";
}

// ---------------------------------------------------------------------------
// FPS rock interaction — minimal entity interface + type guard
// ---------------------------------------------------------------------------

/**
 * Minimal rock entity interface for FPS raycast interaction.
 * ECS entities satisfy this via structural typing.
 * No ECS world import — keeps this module pure and testable.
 */
export interface RockEntity {
  rock: RockComponent;
}

/** Type guard — returns true if the entity has a rock component. */
export function isRockEntity(entity: unknown): entity is RockEntity {
  return (
    typeof entity === "object" &&
    entity !== null &&
    "rock" in entity &&
    typeof (entity as Record<string, unknown>).rock === "object" &&
    (entity as Record<string, unknown>).rock !== null
  );
}

/**
 * Returns the HUD interaction label for a rock.
 * Shown in crosshair prompt when player looks at a mineable rock.
 */
export function getRockInteractionLabel(_entity: RockEntity): string {
  return "Mine";
}

/** Result of resolving an E-key / action interaction with a potential rock entity. */
export interface MiningInteraction {
  /** Whether the entity is a rock at all. */
  isRock: boolean;
  /** Rock type identifier (empty string if not a rock). */
  rockType: string;
  /** Rock hardness value (0 if not a rock). */
  hardness: number;
  /** Stamina cost for one mine hit (0 if not a rock). */
  staminaCost: number;
  /** Label to display in the HUD interaction prompt. */
  interactionLabel: string;
}

/**
 * Resolves the interaction for any raycast-hit entity.
 *
 * Returns `isRock: false` for non-rock entities.
 * Returns `isRock: true` with stamina cost and label for rocks.
 *
 * Pure function — no side effects. Callers decide whether the player
 * has a pick equipped and sufficient stamina before calling mineRock.
 */
export function resolveMiningInteraction(entity: unknown): MiningInteraction {
  if (!isRockEntity(entity)) {
    return {
      isRock: false,
      rockType: "",
      hardness: 0,
      staminaCost: 0,
      interactionLabel: "",
    };
  }

  const rockType = entity.rock.rockType;
  const hardness = getRockHardness(rockType);
  const staminaCost = computeMiningStaminaCost(rockType);

  return {
    isRock: true,
    rockType,
    hardness,
    staminaCost,
    interactionLabel: getRockInteractionLabel(entity),
  };
}
