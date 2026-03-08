/**
 * Survival system tests — Spec §12 Stamina & Survival, §2.2 Survival Systems.
 */

import difficultyConfig from "@/config/game/difficulty.json" with { type: "json" };
import type { HealthComponent } from "@/game/ecs/components/combat";
import {
  computeStaminaRegenMult,
  isPlayerDead,
  isWellFed,
  tickHeartsFromExposure,
  tickHeartsFromStarvation,
  tickHunger,
  tickStaminaDrain,
} from "@/game/systems/survival";

function makeHealth(current: number, max: number): HealthComponent {
  return { current, max, invulnFrames: 0, lastDamageSource: null };
}

// ---------------------------------------------------------------------------
// tickHunger — Spec §12.2
// ---------------------------------------------------------------------------

describe("tickHunger (Spec §12.2)", () => {
  it("drains hunger at base rate (1/min) over 60s", () => {
    const result = tickHunger(100, 100, 60, 1.0);
    expect(result).toBeCloseTo(99.0);
  });

  it("drains proportionally to deltaTime", () => {
    const result = tickHunger(100, 100, 1, 1.0);
    expect(result).toBeCloseTo(100 - 1 / 60);
  });

  it("scales by difficulty hungerDrainRate", () => {
    // Ironwood tier: 2.0/min
    const result = tickHunger(100, 100, 60, 2.0);
    expect(result).toBeCloseTo(98.0);
  });

  it("clamps to zero — does not go negative", () => {
    const result = tickHunger(0.5, 100, 60, 1.0);
    expect(result).toBe(0);
  });

  it("does not exceed maxHunger on tiny dt", () => {
    const result = tickHunger(100, 100, 0.001, 1.0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("skips drain in Exploration mode (affectsGameplay=false)", () => {
    const result = tickHunger(80, 100, 60, 1.0, false);
    expect(result).toBe(80);
  });

  it("handles zero dt — no change", () => {
    const result = tickHunger(75, 100, 0, 1.0);
    expect(result).toBe(75);
  });

  it("handles zero hungerDrainRate — no drain", () => {
    const result = tickHunger(75, 100, 60, 0);
    expect(result).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// isWellFed — Spec §12.2
// ---------------------------------------------------------------------------

describe("isWellFed (Spec §12.2)", () => {
  it("returns true when hunger > 80", () => {
    expect(isWellFed(81)).toBe(true);
    expect(isWellFed(100)).toBe(true);
  });

  it("returns false when hunger <= 80", () => {
    expect(isWellFed(80)).toBe(false);
    expect(isWellFed(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tickHeartsFromStarvation — Spec §12.2
// ---------------------------------------------------------------------------

describe("tickHeartsFromStarvation (Spec §12.2)", () => {
  it("drains hearts at 0.25/min when hunger is zero", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromStarvation(health, 0, 60);
    expect(health.current).toBeCloseTo(5 - 0.25);
  });

  it("does not drain when hunger is above zero", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromStarvation(health, 1, 60);
    expect(health.current).toBe(5);
  });

  it("clamps hearts to zero — does not go negative", () => {
    const health = makeHealth(0.001, 5);
    tickHeartsFromStarvation(health, 0, 60);
    expect(health.current).toBe(0);
  });

  it("skips drain in Exploration mode (affectsGameplay=false)", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromStarvation(health, 0, 60, false);
    expect(health.current).toBe(5);
  });

  it("proportional drain over small dt", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromStarvation(health, 0, 1);
    expect(health.current).toBeCloseTo(5 - 0.25 / 60);
  });
});

// ---------------------------------------------------------------------------
// tickHeartsFromExposure — Spec §2.2
// ---------------------------------------------------------------------------

describe("tickHeartsFromExposure (Spec §2.2)", () => {
  /** Freezing body temp (well below cold threshold of 35°C). */
  const FREEZING = 25;
  /** Normal body temp — should be safe. */
  const NORMAL = 37;

  it("drains hearts when bodyTemp is below cold threshold", () => {
    const health = makeHealth(5, 5);
    // At bodyTemp=25 (10° below threshold of 35), deviation = 1.0 → full rate
    tickHeartsFromExposure(health, 60, 0.3, true, true, FREEZING);
    expect(health.current).toBeCloseTo(5 - 0.3);
  });

  it("does NOT drain at normal body temp (37°C)", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 0.3, true, true, NORMAL);
    expect(health.current).toBe(5);
  });

  it("does not drain when exposureEnabled is false", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 0.3, false, true, FREEZING);
    expect(health.current).toBe(5);
  });

  it("does not drain in Exploration mode (affectsGameplay=false)", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 0.3, true, false, FREEZING);
    expect(health.current).toBe(5);
  });

  it("scales with higher drift rate at extreme cold", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 1.5, true, true, FREEZING);
    expect(health.current).toBeCloseTo(5 - 1.5);
  });

  it("clamps hearts to zero", () => {
    const health = makeHealth(0.001, 5);
    tickHeartsFromExposure(health, 60, 1.0, true, true, FREEZING);
    expect(health.current).toBe(0);
  });

  it("proportional drain over small dt at extreme cold", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 1, 0.3, true, true, FREEZING);
    expect(health.current).toBeCloseTo(5 - 0.3 / 60);
  });

  it("scales damage proportionally to temperature deviation", () => {
    const health = makeHealth(5, 5);
    // bodyTemp=30 → 5° below threshold of 35, deviation = 5/10 = 0.5
    tickHeartsFromExposure(health, 60, 0.3, true, true, 30);
    expect(health.current).toBeCloseTo(5 - 0.15);
  });

  it("drains hearts when bodyTemp exceeds heat threshold", () => {
    const health = makeHealth(5, 5);
    // bodyTemp=45 → 6° above threshold of 39, deviation = 6/6 = 1.0
    tickHeartsFromExposure(health, 60, 0.3, true, true, 45);
    expect(health.current).toBeCloseTo(5 - 0.3);
  });
});

// ---------------------------------------------------------------------------
// tickStaminaDrain — Spec §12.1
// ---------------------------------------------------------------------------

describe("tickStaminaDrain (Spec §12.1)", () => {
  it("drains stamina by baseCost * staminaDrainMult on success", () => {
    const result = tickStaminaDrain(100, 10, 1.0);
    expect(result.success).toBe(true);
    expect(result.stamina).toBeCloseTo(90);
  });

  it("scales cost by staminaDrainMult", () => {
    const result = tickStaminaDrain(100, 10, 1.3);
    expect(result.success).toBe(true);
    expect(result.stamina).toBeCloseTo(87);
  });

  it("fails when stamina is insufficient — no drain", () => {
    const result = tickStaminaDrain(5, 10, 1.0);
    expect(result.success).toBe(false);
    expect(result.stamina).toBe(5);
  });

  it("fails when insufficient after mult — no drain", () => {
    const result = tickStaminaDrain(12, 10, 1.3);
    expect(result.success).toBe(false);
    expect(result.stamina).toBe(12);
  });

  it("succeeds when stamina exactly equals scaled cost", () => {
    const result = tickStaminaDrain(13, 10, 1.3);
    expect(result.success).toBe(true);
    expect(result.stamina).toBeCloseTo(0);
  });

  it("always succeeds in Exploration mode with no drain", () => {
    const result = tickStaminaDrain(5, 50, 1.0, false);
    expect(result.success).toBe(true);
    expect(result.stamina).toBe(5);
  });

  it("always succeeds in Exploration mode even at zero stamina", () => {
    const result = tickStaminaDrain(0, 10, 1.0, false);
    expect(result.success).toBe(true);
    expect(result.stamina).toBe(0);
  });

  it("handles zero cost", () => {
    const result = tickStaminaDrain(50, 0, 1.0);
    expect(result.success).toBe(true);
    expect(result.stamina).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Integration: combined survival tick for a starving player
// ---------------------------------------------------------------------------

describe("combined survival scenario", () => {
  it("starving player at max difficulty loses hearts from both starvation and exposure", () => {
    const health = makeHealth(3, 3);
    const dt = 60; // 1 minute
    // Ultra-brutal: exposureDriftRate=1.5, affectsGameplay=true, exposureEnabled=true
    // bodyTemp=25 (freezing) for full exposure damage
    tickHeartsFromExposure(health, dt, 1.5, true, true, 25);
    tickHeartsFromStarvation(health, 0, dt, true);
    // Expected: 3 - 1.5 (exposure) - 0.25 (starvation) = 1.25
    expect(health.current).toBeCloseTo(1.25);
  });

  it("Exploration mode player is unaffected by all drains", () => {
    const health = makeHealth(7, 7);
    const hunger = tickHunger(100, 100, 60, 0, false);
    tickHeartsFromStarvation(health, 0, 60, false);
    tickHeartsFromExposure(health, 60, 0.3, true, false, 25);
    expect(hunger).toBe(100);
    expect(health.current).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// isPlayerDead — Spec §12.3
// ---------------------------------------------------------------------------

describe("isPlayerDead (Spec §12.3)", () => {
  it("returns true when hearts are exactly zero", () => {
    const health = makeHealth(0, 5);
    expect(isPlayerDead(health)).toBe(true);
  });

  it("returns false when hearts are above zero", () => {
    const health = makeHealth(0.001, 5);
    expect(isPlayerDead(health)).toBe(false);
  });

  it("returns false when hearts are at full", () => {
    const health = makeHealth(5, 5);
    expect(isPlayerDead(health)).toBe(false);
  });

  it("triggers after starvation drains hearts to zero", () => {
    const health = makeHealth(0.001, 5);
    tickHeartsFromStarvation(health, 0, 60);
    expect(isPlayerDead(health)).toBe(true);
  });

  it("triggers after exposure drains hearts to zero", () => {
    const health = makeHealth(0.001, 5);
    tickHeartsFromExposure(health, 60, 1.0, true, true, 25);
    expect(isPlayerDead(health)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeStaminaRegenMult — Spec §12.1, §12.2
// Zero hunger stops stamina regen; Well Fed grants +10% bonus.
// ---------------------------------------------------------------------------

describe("computeStaminaRegenMult (Spec §12.1, §12.2)", () => {
  it("returns 0 when hunger is zero — no stamina regen at starvation", () => {
    expect(computeStaminaRegenMult(0, 1.0)).toBe(0);
  });

  it("returns base mult when hunger is above zero", () => {
    expect(computeStaminaRegenMult(50, 1.0)).toBe(1.0);
  });

  it("returns 1.1x base mult when Well Fed (hunger > 80)", () => {
    expect(computeStaminaRegenMult(81, 1.0)).toBeCloseTo(1.1);
  });

  it("applies difficulty regenMult as base", () => {
    expect(computeStaminaRegenMult(50, 0.8)).toBeCloseTo(0.8);
  });

  it("applies Well Fed bonus on top of difficulty regenMult", () => {
    expect(computeStaminaRegenMult(90, 0.8)).toBeCloseTo(0.88);
  });

  it("returns base regenMult in Exploration mode even at zero hunger", () => {
    expect(computeStaminaRegenMult(0, 1.5, false)).toBe(1.5);
  });

  it("hunger at exactly 1 is not starving — full regen", () => {
    expect(computeStaminaRegenMult(1, 1.0)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Drain rates match difficulty config — Spec §12.2
// ---------------------------------------------------------------------------

describe("hunger drain rates match difficulty config (Spec §12.2)", () => {
  it("Seedling tier: hungerDrainRate is 0 — no hunger drain", () => {
    const seedling = difficultyConfig.find((d) => d.id === "seedling")!;
    expect(seedling.hungerDrainRate).toBe(0);
    // With rate=0, no drain even over a full minute
    expect(tickHunger(100, 100, 60, seedling.hungerDrainRate)).toBe(100);
  });

  it("Sapling tier: hungerDrainRate is 1.0 — 1 unit/min", () => {
    const sapling = difficultyConfig.find((d) => d.id === "sapling")!;
    expect(sapling.hungerDrainRate).toBe(1.0);
    expect(tickHunger(100, 100, 60, sapling.hungerDrainRate)).toBeCloseTo(99.0);
  });

  it("Hardwood tier: hungerDrainRate is 1.5 — 1.5 units/min", () => {
    const hardwood = difficultyConfig.find((d) => d.id === "hardwood")!;
    expect(hardwood.hungerDrainRate).toBe(1.5);
    expect(tickHunger(100, 100, 60, hardwood.hungerDrainRate)).toBeCloseTo(98.5);
  });

  it("Ironwood tier: hungerDrainRate is 2.0 — 2 units/min", () => {
    const ironwood = difficultyConfig.find((d) => d.id === "ironwood")!;
    expect(ironwood.hungerDrainRate).toBe(2.0);
    expect(tickHunger(100, 100, 60, ironwood.hungerDrainRate)).toBeCloseTo(98.0);
  });
});
