/**
 * Survival system tests — Spec §12 Stamina & Survival, §2.2 Survival Systems.
 */

import type { HealthComponent } from "@/game/ecs/components/combat";
import {
  tickHunger,
  isWellFed,
  tickHeartsFromStarvation,
  tickHeartsFromExposure,
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
  it("drains hearts at exposureDriftRate/min when exposure is enabled", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 0.3, true);
    expect(health.current).toBeCloseTo(5 - 0.3);
  });

  it("does not drain when exposureEnabled is false", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 0.3, false);
    expect(health.current).toBe(5);
  });

  it("does not drain in Exploration mode (affectsGameplay=false)", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 0.3, true, false);
    expect(health.current).toBe(5);
  });

  it("scales with higher drift rate (ultra-brutal: 1.5/min)", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 60, 1.5, true);
    expect(health.current).toBeCloseTo(5 - 1.5);
  });

  it("clamps hearts to zero", () => {
    const health = makeHealth(0.001, 5);
    tickHeartsFromExposure(health, 60, 1.0, true);
    expect(health.current).toBe(0);
  });

  it("proportional drain over small dt", () => {
    const health = makeHealth(5, 5);
    tickHeartsFromExposure(health, 1, 0.3, true);
    expect(health.current).toBeCloseTo(5 - 0.3 / 60);
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
    tickHeartsFromExposure(health, dt, 1.5, true, true);
    tickHeartsFromStarvation(health, 0, dt, true);
    // Expected: 3 - 1.5 (exposure) - 0.25 (starvation) = 1.25
    expect(health.current).toBeCloseTo(1.25);
  });

  it("Exploration mode player is unaffected by all drains", () => {
    const health = makeHealth(7, 7);
    const hunger = tickHunger(100, 100, 60, 0, false);
    tickHeartsFromStarvation(health, 0, 60, false);
    tickHeartsFromExposure(health, 60, 0.3, true, false);
    expect(hunger).toBe(100);
    expect(health.current).toBe(7);
  });
});
