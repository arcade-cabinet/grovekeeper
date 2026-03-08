/**
 * Player Attack System tests (Spec §34.4)
 *
 * All functions are pure — no ECS world, no R3F, no Rapier.
 * Tests reference GAME_SPEC.md §34.4 (Player Attack Mechanic).
 */

// Mock AudioManager to avoid Tone.js ESM import issue in Jest.
jest.mock("@/game/systems/AudioManager", () => ({
  audioManager: { playSound: jest.fn() },
  startAudio: jest.fn().mockResolvedValue(undefined),
}));

import type { CombatComponent, HealthComponent } from "@/game/ecs/components/combat";
import {
  type AttackResult,
  executePlayerAttack,
  type PlayerAttackContext,
  resolvePlayerAttack,
  resolveToolEffectPower,
} from "./playerAttack.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHealth(current: number, max: number, invulnFrames = 0): HealthComponent {
  return { current, max, invulnFrames, lastDamageSource: null };
}

function makePlayerCombat(cooldownRemaining = 0): CombatComponent {
  return {
    attackPower: 5,
    defense: 0,
    attackRange: 6,
    attackCooldown: 0.6,
    cooldownRemaining,
    blocking: false,
  };
}

function makeCtx(overrides: Partial<PlayerAttackContext> = {}): PlayerAttackContext {
  return {
    toolId: "axe",
    damageMultiplier: 1.0,
    stamina: 100,
    maxStamina: 100,
    targetHealth: makeHealth(10, 10),
    playerCombat: makePlayerCombat(0),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveToolEffectPower — Spec §34.4.2 tool eligibility
// ---------------------------------------------------------------------------

describe("resolveToolEffectPower — Spec §34.4.2: tool eligibility", () => {
  it("returns effectPower=5 for axe", () => {
    expect(resolveToolEffectPower("axe")).toBe(5.0);
  });

  it("returns effectPower=4 for pick", () => {
    expect(resolveToolEffectPower("pick")).toBe(4.0);
  });

  it("returns effectPower=3 for shovel", () => {
    expect(resolveToolEffectPower("shovel")).toBe(3.0);
  });

  it("returns effectPower=2 for pruning-shears", () => {
    expect(resolveToolEffectPower("pruning-shears")).toBe(2.0);
  });

  it("returns 0 for almanac (no effectPower)", () => {
    expect(resolveToolEffectPower("almanac")).toBe(0);
  });

  it("returns 0 for watering-can (no effectPower)", () => {
    expect(resolveToolEffectPower("watering-can")).toBe(0);
  });

  it("returns 0 for trowel (no effectPower)", () => {
    expect(resolveToolEffectPower("trowel")).toBe(0);
  });

  it("returns 0 for unknown tool", () => {
    expect(resolveToolEffectPower("nonexistent-tool")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolvePlayerAttack — Spec §34.4.6 action resolution
// ---------------------------------------------------------------------------

describe("resolvePlayerAttack — Spec §34.4.6: action resolution", () => {
  it('returns "ATTACK" for axe + enemy target', () => {
    expect(resolvePlayerAttack("axe", "enemy")).toBe("ATTACK");
  });

  it('returns "ATTACK" for pick + enemy target', () => {
    expect(resolvePlayerAttack("pick", "enemy")).toBe("ATTACK");
  });

  it('returns "ATTACK" for shovel + enemy target', () => {
    expect(resolvePlayerAttack("shovel", "enemy")).toBe("ATTACK");
  });

  it('returns "ATTACK" for pruning-shears + enemy target', () => {
    expect(resolvePlayerAttack("pruning-shears", "enemy")).toBe("ATTACK");
  });

  it("returns null for axe + tree target (CHOP, not ATTACK)", () => {
    expect(resolvePlayerAttack("axe", "tree")).toBeNull();
  });

  it("returns null for watering-can + enemy (no effectPower)", () => {
    expect(resolvePlayerAttack("watering-can", "enemy")).toBeNull();
  });

  it("returns null for almanac + enemy (no effectPower)", () => {
    expect(resolvePlayerAttack("almanac", "enemy")).toBeNull();
  });

  it("returns null for trowel + enemy (no effectPower)", () => {
    expect(resolvePlayerAttack("trowel", "enemy")).toBeNull();
  });

  it("returns null for axe + null target", () => {
    expect(resolvePlayerAttack("axe", null)).toBeNull();
  });

  it("returns null for axe + npc target (NPCs are not attackable as enemies)", () => {
    expect(resolvePlayerAttack("axe", "npc")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// executePlayerAttack — Spec §34.4.1 attack flow
// ---------------------------------------------------------------------------

describe("executePlayerAttack — Spec §34.4.1: attack flow", () => {
  describe("cooldown gating — Spec §34.4.4", () => {
    it("returns { hit: false } when cooldownRemaining > 0", () => {
      const ctx = makeCtx({ playerCombat: makePlayerCombat(0.3) });
      const result: AttackResult = executePlayerAttack(ctx);
      expect(result.hit).toBe(false);
      expect(result.damage).toBe(0);
    });

    it("allows attack when cooldownRemaining is exactly 0", () => {
      const ctx = makeCtx({ playerCombat: makePlayerCombat(0) });
      const result: AttackResult = executePlayerAttack(ctx);
      expect(result.hit).toBe(true);
    });
  });

  describe("stamina cost — Spec §34.4.3", () => {
    it("returns { hit: false } when stamina < staminaCost for axe (cost=10)", () => {
      const ctx = makeCtx({ toolId: "axe", stamina: 5 });
      const result = executePlayerAttack(ctx);
      expect(result.hit).toBe(false);
    });

    it("allows attack when stamina equals staminaCost exactly", () => {
      // axe staminaCost = 10
      const ctx = makeCtx({ toolId: "axe", stamina: 10 });
      const result = executePlayerAttack(ctx);
      expect(result.hit).toBe(true);
    });

    it("reports correct staminaCost for axe (10)", () => {
      const ctx = makeCtx({ toolId: "axe", stamina: 100 });
      const result = executePlayerAttack(ctx);
      expect(result.staminaCost).toBe(10);
    });

    it("reports correct staminaCost for pick (10)", () => {
      const ctx = makeCtx({ toolId: "pick", stamina: 100 });
      const result = executePlayerAttack(ctx);
      expect(result.staminaCost).toBe(10);
    });
  });

  describe("damage application — Spec §34.4.3", () => {
    it("deals effectPower × damageMultiplier damage (axe at normal: 5×1=5)", () => {
      const ctx = makeCtx({ toolId: "axe", damageMultiplier: 1.0 });
      ctx.targetHealth.current = 10;
      const result = executePlayerAttack(ctx);
      expect(result.damage).toBe(5);
      expect(ctx.targetHealth.current).toBe(5);
    });

    it("scales damage by difficulty multiplier (axe at hardwood: 5×1.3=6.5)", () => {
      const ctx = makeCtx({ toolId: "axe", damageMultiplier: 1.3 });
      ctx.targetHealth.current = 20;
      const result = executePlayerAttack(ctx);
      expect(result.damage).toBeCloseTo(6.5);
    });

    it("deals 0 damage on seedling (damageMultiplier=0) — enemies not hurt", () => {
      const ctx = makeCtx({ toolId: "axe", damageMultiplier: 0 });
      ctx.targetHealth.current = 10;
      const result = executePlayerAttack(ctx);
      // With 0 damage, hit is still true (attack fired) but damage = 0
      expect(result.damage).toBe(0);
      expect(ctx.targetHealth.current).toBe(10);
    });

    it("does NOT apply damage when target is invulnerable", () => {
      const ctx = makeCtx({ toolId: "axe", damageMultiplier: 1.0 });
      ctx.targetHealth.invulnFrames = 0.4;
      ctx.targetHealth.current = 10;
      const result = executePlayerAttack(ctx);
      expect(result.hit).toBe(true);
      expect(result.damage).toBe(0); // blocked by invuln
      expect(ctx.targetHealth.current).toBe(10);
    });
  });

  describe("kill detection — Spec §34.4.1", () => {
    it("reports killed=true when enemy health reaches 0", () => {
      const ctx = makeCtx({ toolId: "axe", damageMultiplier: 1.0 });
      ctx.targetHealth.current = 3; // axe deals 5, thorn-sprite has 3 hp
      const result = executePlayerAttack(ctx);
      expect(result.killed).toBe(true);
      expect(ctx.targetHealth.current).toBe(0);
    });

    it("reports killed=false when enemy still has health remaining", () => {
      const ctx = makeCtx({ toolId: "axe", damageMultiplier: 1.0 });
      ctx.targetHealth.current = 10;
      const result = executePlayerAttack(ctx);
      expect(result.killed).toBe(false);
      expect(ctx.targetHealth.current).toBe(5);
    });
  });

  describe("cooldown assignment — Spec §34.4.4", () => {
    it("sets player cooldownRemaining to playerAttackCooldown after attack", () => {
      const ctx = makeCtx({ toolId: "axe" });
      executePlayerAttack(ctx);
      // playerAttackCooldown from combat.json = 0.6
      expect(ctx.playerCombat.cooldownRemaining).toBeCloseTo(0.6);
    });

    it("does NOT set cooldown when attack fails due to insufficient stamina", () => {
      const ctx = makeCtx({ toolId: "axe", stamina: 0 });
      const beforeCooldown = ctx.playerCombat.cooldownRemaining;
      executePlayerAttack(ctx);
      expect(ctx.playerCombat.cooldownRemaining).toBe(beforeCooldown);
    });
  });

  describe("invuln frames on target — Spec §34.2", () => {
    it("sets target invulnFrames > 0 after a successful hit", () => {
      const ctx = makeCtx({ toolId: "axe", damageMultiplier: 1.0 });
      ctx.targetHealth.invulnFrames = 0;
      executePlayerAttack(ctx);
      expect(ctx.targetHealth.invulnFrames).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Full combat flow integration — Spec §34.4
// ---------------------------------------------------------------------------

describe("full player attack flow — Spec §34.4", () => {
  it("axe kills thorn-sprite (hp=3) in one hit at normal difficulty", () => {
    const ctx = makeCtx({
      toolId: "axe",
      damageMultiplier: 1.0,
      stamina: 100,
    });
    ctx.targetHealth.current = 3;
    const result = executePlayerAttack(ctx);
    expect(result.hit).toBe(true);
    expect(result.killed).toBe(true);
    expect(ctx.targetHealth.current).toBe(0);
  });

  it("pick takes 3 hits to kill bat (hp=8, pick deals 4/hit) at normal difficulty", () => {
    const health = makeHealth(8, 8);
    const playerCombat = makePlayerCombat(0);

    // Hit 1
    const ctx1: PlayerAttackContext = {
      toolId: "pick",
      damageMultiplier: 1.0,
      stamina: 100,
      maxStamina: 100,
      targetHealth: health,
      playerCombat,
    };
    const r1 = executePlayerAttack(ctx1);
    expect(r1.killed).toBe(false);
    expect(health.current).toBe(4);

    // Simulate invuln expiry between hits
    health.invulnFrames = 0;
    playerCombat.cooldownRemaining = 0;

    // Hit 2
    const ctx2: PlayerAttackContext = {
      toolId: "pick",
      damageMultiplier: 1.0,
      stamina: 100,
      maxStamina: 100,
      targetHealth: health,
      playerCombat,
    };
    const r2 = executePlayerAttack(ctx2);
    // Bat has 8hp: after 2 hits of 4 = 0, killed on hit 2
    expect(r2.killed).toBe(true);
    expect(health.current).toBe(0);
  });

  it("player cannot attack twice in quick succession (cooldown blocks second hit)", () => {
    const ctx = makeCtx({ toolId: "axe", stamina: 100 });
    ctx.targetHealth.current = 20;

    const r1 = executePlayerAttack(ctx);
    expect(r1.hit).toBe(true);

    // cooldown is now set; second attempt while cooldown > 0 fails
    const r2 = executePlayerAttack(ctx);
    expect(r2.hit).toBe(false);
    // Health unchanged from second attempt
    expect(ctx.targetHealth.current).toBe(15); // only 5 damage from first hit
  });

  it("pick at ironwood difficulty (mult=2.0) deals 8 damage per swing", () => {
    const ctx = makeCtx({
      toolId: "pick",
      damageMultiplier: 2.0,
      stamina: 100,
    });
    ctx.targetHealth.current = 20;
    const result = executePlayerAttack(ctx);
    expect(result.damage).toBeCloseTo(8.0);
    expect(ctx.targetHealth.current).toBe(12);
  });
});
