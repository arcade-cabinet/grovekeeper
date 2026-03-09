/**
 * Difficulty multiplier integration tests.
 *
 * Validates that each difficulty tier's multipliers are correctly wired
 * through all game systems: hunger drain, stamina regen, enemy damage,
 * resource yields, and tree growth speed.
 *
 * Spec §12 (survival), §37 (difficulty tiers), §34.2 (combat).
 */

import type { DifficultyConfig } from "@/game/config/difficulty";
import { DIFFICULTIES, getDifficultyById } from "@/game/config/difficulty";
import { computeEnemyDamage, computePlayerDamage } from "@/game/systems/combat";
import { regenStamina } from "@/game/systems/stamina";
import { computeStaminaRegenMult, tickHunger, tickStaminaDrain } from "@/game/systems/survival";

// ---------------------------------------------------------------------------
// Difficulty config structure validation — Spec §37
// ---------------------------------------------------------------------------

describe("Difficulty config structure (Spec §37)", () => {
  it("defines exactly 4 tiers: seedling, sapling, hardwood, ironwood", () => {
    const ids = DIFFICULTIES.map((d) => d.id);
    expect(ids).toEqual(["seedling", "sapling", "hardwood", "ironwood"]);
  });

  it("each tier has all required multiplier fields", () => {
    const requiredFields: (keyof DifficultyConfig)[] = [
      "growthSpeedMult",
      "resourceYieldMult",
      "staminaDrainMult",
      "staminaRegenMult",
      "hungerDrainRate",
      "damageMultiplier",
      "incomingDamageMultiplier",
    ];
    for (const tier of DIFFICULTIES) {
      for (const field of requiredFields) {
        expect(tier).toHaveProperty(field);
        expect(typeof tier[field]).toBe("number");
      }
    }
  });

  it("getDifficultyById returns correct tier", () => {
    expect(getDifficultyById("sapling")?.id).toBe("sapling");
    expect(getDifficultyById("ironwood")?.id).toBe("ironwood");
    expect(getDifficultyById("nonexistent")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Seedling (Exploration) — all survival systems disabled — Spec §37.1
// ---------------------------------------------------------------------------

describe("Seedling (Exploration) multipliers (Spec §37.1)", () => {
  const seedling = getDifficultyById("seedling")!;

  it("has affectsGameplay = false", () => {
    expect(seedling.affectsGameplay).toBe(false);
  });

  it("hungerDrainRate is 0 — no hunger drain", () => {
    expect(seedling.hungerDrainRate).toBe(0);
    expect(tickHunger(100, 100, 60, seedling.hungerDrainRate)).toBe(100);
  });

  it("staminaDrainMult is 0 — no stamina cost for actions", () => {
    expect(seedling.staminaDrainMult).toBe(0);
    const result = tickStaminaDrain(50, 10, seedling.staminaDrainMult, seedling.affectsGameplay);
    expect(result.success).toBe(true);
    expect(result.stamina).toBe(50); // no cost deducted (exploration mode)
  });

  it("staminaRegenMult is 1.5 — faster regen", () => {
    expect(seedling.staminaRegenMult).toBe(1.5);
  });

  it("damageMultiplier and incomingDamageMultiplier are 0 — no combat", () => {
    expect(seedling.damageMultiplier).toBe(0);
    expect(seedling.incomingDamageMultiplier).toBe(0);
    expect(computePlayerDamage(5, seedling.damageMultiplier)).toBe(0);
    expect(computeEnemyDamage(8, seedling.incomingDamageMultiplier)).toBe(0);
  });

  it("growthSpeedMult is 1.3 — faster growth", () => {
    expect(seedling.growthSpeedMult).toBe(1.3);
  });

  it("resourceYieldMult is 1.3 — more resources", () => {
    expect(seedling.resourceYieldMult).toBe(1.3);
  });
});

// ---------------------------------------------------------------------------
// Sapling (Normal) — baseline multipliers — Spec §37.2
// ---------------------------------------------------------------------------

describe("Sapling (Normal) multipliers (Spec §37.2)", () => {
  const sapling = getDifficultyById("sapling")!;

  it("all multipliers are 1.0 (baseline)", () => {
    expect(sapling.growthSpeedMult).toBe(1.0);
    expect(sapling.resourceYieldMult).toBe(1.0);
    expect(sapling.staminaDrainMult).toBe(1.0);
    expect(sapling.staminaRegenMult).toBe(1.0);
    expect(sapling.hungerDrainRate).toBe(1.0);
    expect(sapling.damageMultiplier).toBe(1.0);
    expect(sapling.incomingDamageMultiplier).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Hardwood (Hard) — tougher multipliers — Spec §37.2
// ---------------------------------------------------------------------------

describe("Hardwood (Hard) multipliers (Spec §37.2)", () => {
  const hardwood = getDifficultyById("hardwood")!;

  it("growth is slower (0.8x)", () => {
    expect(hardwood.growthSpeedMult).toBe(0.8);
  });

  it("resource yield is lower (0.75x)", () => {
    expect(hardwood.resourceYieldMult).toBe(0.75);
  });

  it("stamina drains faster (1.3x)", () => {
    expect(hardwood.staminaDrainMult).toBe(1.3);
  });

  it("stamina regens slower (0.8x)", () => {
    expect(hardwood.staminaRegenMult).toBe(0.8);
  });

  it("hunger drains faster (1.5x)", () => {
    expect(hardwood.hungerDrainRate).toBe(1.5);
  });

  it("enemy damage scales up (1.3x both ways)", () => {
    expect(hardwood.damageMultiplier).toBe(1.3);
    expect(hardwood.incomingDamageMultiplier).toBe(1.3);
    expect(computePlayerDamage(5, hardwood.damageMultiplier)).toBeCloseTo(6.5);
    expect(computeEnemyDamage(8, hardwood.incomingDamageMultiplier)).toBeCloseTo(10.4);
  });
});

// ---------------------------------------------------------------------------
// Ironwood (Brutal) — maximum difficulty — Spec §37.2
// ---------------------------------------------------------------------------

describe("Ironwood (Brutal) multipliers (Spec §37.2)", () => {
  const ironwood = getDifficultyById("ironwood")!;

  it("growth is very slow (0.4x)", () => {
    expect(ironwood.growthSpeedMult).toBe(0.4);
  });

  it("resource yield is very low (0.3x)", () => {
    expect(ironwood.resourceYieldMult).toBe(0.3);
  });

  it("stamina drains 2x faster", () => {
    expect(ironwood.staminaDrainMult).toBe(2.0);
    const result = tickStaminaDrain(100, 10, ironwood.staminaDrainMult);
    expect(result.stamina).toBeCloseTo(80); // 10 * 2.0 = 20 cost
  });

  it("stamina regens very slowly (0.4x)", () => {
    expect(ironwood.staminaRegenMult).toBe(0.4);
    // Base regen = 2/sec, with 0.4x mult = 0.8/sec
    const result = regenStamina(50, 100, 1.0, ironwood.staminaRegenMult);
    expect(result).toBeCloseTo(50.8); // 50 + 2 * 0.4 * 1.0
  });

  it("hunger drains 2x faster", () => {
    expect(ironwood.hungerDrainRate).toBe(2.0);
    const result = tickHunger(100, 100, 60, ironwood.hungerDrainRate);
    expect(result).toBeCloseTo(98.0); // 2 units/min over 60s
  });

  it("enemy damage is doubled (2.0x both ways)", () => {
    expect(ironwood.damageMultiplier).toBe(2.0);
    expect(ironwood.incomingDamageMultiplier).toBe(2.0);
    expect(computePlayerDamage(5, ironwood.damageMultiplier)).toBe(10);
    expect(computeEnemyDamage(8, ironwood.incomingDamageMultiplier)).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// Stamina regen with difficulty + hunger gating — Spec §12.1, §37
// ---------------------------------------------------------------------------

describe("Stamina regen with difficulty multiplier (Spec §12.1, §37)", () => {
  it("computes effective regen mult from difficulty staminaRegenMult + hunger state", () => {
    const hardwood = getDifficultyById("hardwood")!;
    // Normal hunger (50) + hardwood regenMult (0.8) = 0.8
    const mult = computeStaminaRegenMult(50, hardwood.staminaRegenMult);
    expect(mult).toBeCloseTo(0.8);
  });

  it("Well Fed bonus stacks with difficulty regenMult", () => {
    const hardwood = getDifficultyById("hardwood")!;
    // Well Fed (hunger=90) + hardwood (0.8) = 0.8 * 1.1 = 0.88
    const mult = computeStaminaRegenMult(90, hardwood.staminaRegenMult);
    expect(mult).toBeCloseTo(0.88);
  });

  it("zero hunger blocks stamina regen regardless of difficulty", () => {
    const ironwood = getDifficultyById("ironwood")!;
    const mult = computeStaminaRegenMult(0, ironwood.staminaRegenMult);
    expect(mult).toBe(0);
  });

  it("Exploration mode bypasses hunger gating", () => {
    const seedling = getDifficultyById("seedling")!;
    // Even at 0 hunger, exploration returns base mult (affectsGameplay=false bypasses hunger gating)
    const mult = computeStaminaRegenMult(0, seedling.staminaRegenMult, seedling.affectsGameplay);
    expect(mult).toBe(seedling.staminaRegenMult);
  });

  it("effective regen: regenStamina with computeStaminaRegenMult output", () => {
    const ironwood = getDifficultyById("ironwood")!;
    // Normal hunger: regenMult = 0.4
    const effectiveMult = computeStaminaRegenMult(50, ironwood.staminaRegenMult);
    expect(effectiveMult).toBeCloseTo(0.4);
    // Base regen 2/sec * 0.4 * 1.0s = 0.8
    const result = regenStamina(50, 100, 1.0, effectiveMult);
    expect(result).toBeCloseTo(50.8);
  });
});
