/**
 * Mining system tests (Spec §22)
 *
 * Covers:
 * - Rock hardness lookup from config
 * - Stamina cost scaling with hardness
 * - Ore type determined by biome
 * - mineRock produces correct resource type and amount
 * - isPickTool identifies pick action
 * - FPS rock interaction: type guard, label, resolver
 */

import type { MineResult, MiningInteraction, OreYield, RockEntity } from "./mining.ts";
import {
  computeMiningStaminaCost,
  getOreForBiome,
  getRockHardness,
  getRockInteractionLabel,
  isPickTool,
  isRockEntity,
  mineRock,
  resolveMiningInteraction,
} from "./mining.ts";

// ---------------------------------------------------------------------------
// Rock hardness
// ---------------------------------------------------------------------------

describe("Mining System — Rock hardness (Spec §22)", () => {
  it("returns hardness 1 for unknown rock type (default)", () => {
    expect(getRockHardness("pebble")).toBe(1);
  });

  it("returns hardness 1 for explicit 'default' key", () => {
    expect(getRockHardness("default")).toBe(1);
  });

  it("returns hardness 2 for granite", () => {
    expect(getRockHardness("granite")).toBe(2);
  });

  it("returns hardness 3 for iron-vein", () => {
    expect(getRockHardness("iron-vein")).toBe(3);
  });

  it("returns hardness 4 for obsidian", () => {
    expect(getRockHardness("obsidian")).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Stamina cost scaling with hardness
// ---------------------------------------------------------------------------

describe("computeMiningStaminaCost (Spec §22)", () => {
  it("default rock costs baseStaminaPerHardness × 1", () => {
    const cost = computeMiningStaminaCost("default");
    expect(cost).toBe(8); // hardness=1 * baseStaminaPerHardness=8
  });

  it("granite costs baseStaminaPerHardness × 2", () => {
    expect(computeMiningStaminaCost("granite")).toBe(16);
  });

  it("iron-vein costs baseStaminaPerHardness × 3", () => {
    expect(computeMiningStaminaCost("iron-vein")).toBe(24);
  });

  it("obsidian costs baseStaminaPerHardness × 4", () => {
    expect(computeMiningStaminaCost("obsidian")).toBe(32);
  });

  it("unknown rock type falls back to hardness 1 (same as default)", () => {
    expect(computeMiningStaminaCost("unknown-rock")).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Ore table per biome
// ---------------------------------------------------------------------------

describe("getOreForBiome (Spec §22)", () => {
  it("starting-grove yields stone", () => {
    const ore = getOreForBiome("starting-grove");
    expect(ore.oreType).toBe("stone");
  });

  it("meadow yields stone", () => {
    expect(getOreForBiome("meadow").oreType).toBe("stone");
  });

  it("ancient-forest yields stone", () => {
    expect(getOreForBiome("ancient-forest").oreType).toBe("stone");
  });

  it("wetlands yields stone", () => {
    expect(getOreForBiome("wetlands").oreType).toBe("stone");
  });

  it("orchard-valley yields stone", () => {
    expect(getOreForBiome("orchard-valley").oreType).toBe("stone");
  });

  it("rocky-highlands yields ore (rare vein biome)", () => {
    expect(getOreForBiome("rocky-highlands").oreType).toBe("ore");
  });

  it("frozen-peaks yields ore (rare vein biome)", () => {
    expect(getOreForBiome("frozen-peaks").oreType).toBe("ore");
  });

  it("twilight-glade yields ore (rare vein biome)", () => {
    expect(getOreForBiome("twilight-glade").oreType).toBe("ore");
  });

  it("all biomes return a valid oreType string", () => {
    const biomes = [
      "starting-grove",
      "meadow",
      "ancient-forest",
      "wetlands",
      "rocky-highlands",
      "orchard-valley",
      "frozen-peaks",
      "twilight-glade",
    ] as const;
    for (const biome of biomes) {
      const ore = getOreForBiome(biome);
      expect(typeof ore.oreType).toBe("string");
      expect(ore.oreType.length).toBeGreaterThan(0);
    }
  });

  it("all biomes have minAmount <= maxAmount", () => {
    const biomes = [
      "starting-grove",
      "meadow",
      "ancient-forest",
      "wetlands",
      "rocky-highlands",
      "orchard-valley",
      "frozen-peaks",
      "twilight-glade",
    ] as const;
    for (const biome of biomes) {
      const ore = getOreForBiome(biome);
      expect(ore.minAmount).toBeLessThanOrEqual(ore.maxAmount);
    }
  });
});

// ---------------------------------------------------------------------------
// mineRock — produces ore resources
// ---------------------------------------------------------------------------

describe("mineRock (Spec §22)", () => {
  const rock = { rockType: "default", variant: 0, modelPath: "rocks/rock.glb" };

  it("returns the correct oreType for the biome", () => {
    const result = mineRock(rock, "rocky-highlands", 0.5);
    expect(result.oreType).toBe("ore");
  });

  it("returns stone for stone biomes", () => {
    const result = mineRock(rock, "starting-grove", 0.5);
    expect(result.oreType).toBe("stone");
  });

  it("amount is at least minAmount", () => {
    const result = mineRock(rock, "starting-grove", 0.0);
    expect(result.amount).toBeGreaterThanOrEqual(1);
  });

  it("amount is at most maxAmount", () => {
    const result = mineRock(rock, "starting-grove", 1.0);
    expect(result.amount).toBeLessThanOrEqual(2);
  });

  it("rngValue=0.0 always yields minAmount", () => {
    const result = mineRock(rock, "frozen-peaks", 0.0);
    expect(result.amount).toBe(1); // frozen-peaks minAmount=1
  });

  it("rngValue approaching 1.0 yields maxAmount", () => {
    const result = mineRock(rock, "frozen-peaks", 0.99);
    expect(result.amount).toBe(3); // frozen-peaks maxAmount=3
  });

  it("twilight-glade minimum is 2", () => {
    const result = mineRock(rock, "twilight-glade", 0.0);
    expect(result.amount).toBe(2);
  });

  it("does not mutate the rock component", () => {
    const originalType = rock.rockType;
    mineRock(rock, "meadow", 0.5);
    expect(rock.rockType).toBe(originalType);
  });
});

// ---------------------------------------------------------------------------
// isPickTool
// ---------------------------------------------------------------------------

describe("isPickTool (Spec §22)", () => {
  it("returns true for MINE action", () => {
    expect(isPickTool("MINE")).toBe(true);
  });

  it("returns false for CHOP action", () => {
    expect(isPickTool("CHOP")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isPickTool("")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPickTool(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FPS rock interaction type guard
// ---------------------------------------------------------------------------

describe("isRockEntity (Spec §22)", () => {
  it("returns true for valid rock entity", () => {
    const entity: RockEntity = { rock: { rockType: "granite", variant: 0, modelPath: "" } };
    expect(isRockEntity(entity)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRockEntity(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRockEntity(undefined)).toBe(false);
  });

  it("returns false for entity without rock field", () => {
    expect(isRockEntity({ campfire: { lit: true } })).toBe(false);
  });

  it("returns false when rock field is null", () => {
    expect(isRockEntity({ rock: null })).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isRockEntity(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FPS interaction label + resolver
// ---------------------------------------------------------------------------

describe("getRockInteractionLabel (Spec §22)", () => {
  it("returns 'Mine' for any rock entity", () => {
    const entity: RockEntity = { rock: { rockType: "granite", variant: 0, modelPath: "" } };
    expect(getRockInteractionLabel(entity)).toBe("Mine");
  });
});

describe("resolveMiningInteraction (Spec §22)", () => {
  it("returns isRock:false for non-rock entity", () => {
    const result = resolveMiningInteraction({ campfire: { lit: true } });
    expect(result.isRock).toBe(false);
    expect(result.interactionLabel).toBe("");
    expect(result.staminaCost).toBe(0);
  });

  it("returns isRock:false for null", () => {
    const result = resolveMiningInteraction(null);
    expect(result.isRock).toBe(false);
  });

  it("returns isRock:true for a valid rock entity", () => {
    const entity: RockEntity = { rock: { rockType: "default", variant: 0, modelPath: "" } };
    const result = resolveMiningInteraction(entity);
    expect(result.isRock).toBe(true);
  });

  it("returns correct rockType in result", () => {
    const entity: RockEntity = { rock: { rockType: "granite", variant: 0, modelPath: "" } };
    const result = resolveMiningInteraction(entity);
    expect(result.rockType).toBe("granite");
  });

  it("returns correct hardness for default rock (1)", () => {
    const entity: RockEntity = { rock: { rockType: "default", variant: 0, modelPath: "" } };
    const result = resolveMiningInteraction(entity);
    expect(result.hardness).toBe(1);
  });

  it("returns correct hardness for obsidian (4)", () => {
    const entity: RockEntity = { rock: { rockType: "obsidian", variant: 0, modelPath: "" } };
    const result = resolveMiningInteraction(entity);
    expect(result.hardness).toBe(4);
  });

  it("stamina cost is hardness × 8 for granite", () => {
    const entity: RockEntity = { rock: { rockType: "granite", variant: 0, modelPath: "" } };
    const result = resolveMiningInteraction(entity);
    expect(result.staminaCost).toBe(16); // hardness=2 * base=8
  });

  it("interaction label is 'Mine'", () => {
    const entity: RockEntity = { rock: { rockType: "granite", variant: 0, modelPath: "" } };
    const result = resolveMiningInteraction(entity);
    expect(result.interactionLabel).toBe("Mine");
  });
});
