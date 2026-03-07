/**
 * Combat System tests (Spec §34)
 *
 * All functions are pure — no ECS world, no Rapier, no R3F.
 * Tests reference GAME_SPEC.md §34.2 (Combat Mechanics).
 */

import {
  computePlayerDamage,
  computeEnemyDamage,
  applyDamageToHealth,
  isDefeated,
  tickInvulnFrames,
  computeKnockback,
  tickAttackCooldown,
} from "./combat";
import type { HealthComponent, CombatComponent } from "@/game/ecs/components/combat";

function makeHealth(
  current: number,
  max: number,
  invulnFrames = 0,
): HealthComponent {
  return { current, max, invulnFrames, lastDamageSource: null };
}

function makeCombat(cooldownRemaining = 0): CombatComponent {
  return {
    attackPower: 5,
    defense: 0,
    attackRange: 2,
    attackCooldown: 1.0,
    cooldownRemaining,
    blocking: false,
  };
}

describe("Combat System (Spec §34)", () => {
  describe("computePlayerDamage — Spec §34.2: Damage = tool.effectPower × difficulty.damageMultiplier", () => {
    it("returns effectPower × damageMultiplier at normal difficulty", () => {
      expect(computePlayerDamage(5.0, 1.0)).toBe(5.0);
    });

    it("scales up on hard difficulty (×1.3)", () => {
      expect(computePlayerDamage(5.0, 1.3)).toBeCloseTo(6.5);
    });

    it("returns 0 in explore mode (multiplier = 0)", () => {
      expect(computePlayerDamage(5.0, 0)).toBe(0);
    });

    it("axe (effectPower=5) × brutal (×1.5) = 7.5", () => {
      expect(computePlayerDamage(5.0, 1.5)).toBeCloseTo(7.5);
    });
  });

  describe("computeEnemyDamage — Spec §34.2: Player damage = enemy.damage × difficulty.incomingDamageMultiplier", () => {
    it("returns attackPower × incomingDamageMultiplier at normal (×1.0)", () => {
      expect(computeEnemyDamage(8.0, 1.0)).toBe(8.0);
    });

    it("doubles on ultra-brutal (×2.0)", () => {
      expect(computeEnemyDamage(8.0, 2.0)).toBe(16.0);
    });

    it("returns 0 in explore mode (multiplier = 0)", () => {
      expect(computeEnemyDamage(8.0, 0)).toBe(0);
    });
  });

  describe("applyDamageToHealth — health tracking", () => {
    it("reduces health.current by damage amount", () => {
      const health = makeHealth(20, 20);
      applyDamageToHealth(health, 5, "axe");
      expect(health.current).toBe(15);
    });

    it("clamps health.current to 0 on overkill damage", () => {
      const health = makeHealth(3, 20);
      applyDamageToHealth(health, 10, "axe");
      expect(health.current).toBe(0);
    });

    it("sets lastDamageSource to the attacker id", () => {
      const health = makeHealth(20, 20);
      applyDamageToHealth(health, 5, "enemy-bat");
      expect(health.lastDamageSource).toBe("enemy-bat");
    });

    it("sets invulnFrames > 0 after taking damage", () => {
      const health = makeHealth(20, 20);
      applyDamageToHealth(health, 5, "axe");
      expect(health.invulnFrames).toBeGreaterThan(0);
    });

    it("skips damage when entity is still invulnerable (invulnFrames > 0)", () => {
      const health = makeHealth(20, 20, 0.5);
      applyDamageToHealth(health, 5, "axe");
      expect(health.current).toBe(20);
    });

    it("does not set invulnFrames when entity is invulnerable and damage is skipped", () => {
      const health = makeHealth(20, 20, 0.3);
      applyDamageToHealth(health, 5, "axe");
      expect(health.invulnFrames).toBe(0.3); // unchanged
    });
  });

  describe("isDefeated — enemy/player death detection", () => {
    it("returns true when health.current is 0", () => {
      expect(isDefeated(makeHealth(0, 20))).toBe(true);
    });

    it("returns true when health.current is negative (clamping edge case)", () => {
      expect(isDefeated(makeHealth(-1, 20))).toBe(true);
    });

    it("returns false when health.current is above 0", () => {
      expect(isDefeated(makeHealth(1, 20))).toBe(false);
    });

    it("returns false at full health", () => {
      expect(isDefeated(makeHealth(20, 20))).toBe(false);
    });
  });

  describe("tickInvulnFrames — invuln timer decay", () => {
    it("decrements invulnFrames by dt", () => {
      const health = makeHealth(20, 20, 0.5);
      tickInvulnFrames(health, 0.1);
      expect(health.invulnFrames).toBeCloseTo(0.4);
    });

    it("clamps to 0 (never goes negative)", () => {
      const health = makeHealth(20, 20, 0.1);
      tickInvulnFrames(health, 0.5);
      expect(health.invulnFrames).toBe(0);
    });

    it("does nothing if invulnFrames is already 0", () => {
      const health = makeHealth(20, 20, 0);
      tickInvulnFrames(health, 0.016);
      expect(health.invulnFrames).toBe(0);
    });
  });

  describe("computeKnockback — Spec §34.2: enemy knockback on hit", () => {
    it("returns a vector pointing away from the attacker", () => {
      // Attacker at (0,0), target at (5,0) → knockback points in +X direction
      const kb = computeKnockback(0, 0, 5, 0, 3);
      expect(kb.x).toBeCloseTo(3);
      expect(kb.z).toBeCloseTo(0);
    });

    it("normalizes direction and scales by force for diagonal hit", () => {
      const kb = computeKnockback(0, 0, 1, 1, Math.SQRT2);
      expect(kb.x).toBeCloseTo(1);
      expect(kb.z).toBeCloseTo(1);
    });

    it("returns zero vector when positions are identical (avoid NaN)", () => {
      const kb = computeKnockback(5, 5, 5, 5, 10);
      expect(kb.x).toBe(0);
      expect(kb.z).toBe(0);
    });

    it("direction is always away from attacker regardless of quadrant", () => {
      // Attacker at (5, 5), target at (3, 3) → knockback toward (-1,-1) normalized
      const kb = computeKnockback(5, 5, 3, 3, Math.SQRT2);
      expect(kb.x).toBeCloseTo(-1);
      expect(kb.z).toBeCloseTo(-1);
    });
  });

  describe("tickAttackCooldown — attack rate limiting", () => {
    it("decrements cooldownRemaining by dt", () => {
      const combat = makeCombat(1.0);
      tickAttackCooldown(combat, 0.016);
      expect(combat.cooldownRemaining).toBeCloseTo(0.984);
    });

    it("clamps to 0 (never negative)", () => {
      const combat = makeCombat(0.01);
      tickAttackCooldown(combat, 0.1);
      expect(combat.cooldownRemaining).toBe(0);
    });

    it("does nothing if cooldownRemaining is already 0", () => {
      const combat = makeCombat(0);
      tickAttackCooldown(combat, 0.016);
      expect(combat.cooldownRemaining).toBe(0);
    });
  });

  describe("full combat flow — player can fight and defeat an enemy", () => {
    it("player kills enemy after enough hits with an axe at normal difficulty", () => {
      // Thorn sprite: hp=3, player: axe effectPower=5 × normal mult=1.0 = 5 damage
      const enemyHealth = makeHealth(3, 3);
      const damage = computePlayerDamage(5.0, 1.0);

      applyDamageToHealth(enemyHealth, damage, "player-axe");

      expect(isDefeated(enemyHealth)).toBe(true);
    });

    it("stone golem survives first axe hit (hp=10, axe=5 damage)", () => {
      const enemyHealth = makeHealth(10, 10);
      const damage = computePlayerDamage(5.0, 1.0);

      applyDamageToHealth(enemyHealth, damage, "player-axe");

      expect(isDefeated(enemyHealth)).toBe(false);
      expect(enemyHealth.current).toBe(5);
    });

    it("enemy damages player respecting difficulty (brutal: incomingMult=1.5)", () => {
      const playerHealth = makeHealth(20, 20);
      // Bat attackPower = 3 × brutal incomingMult = 1.5 → 4.5 damage
      const damage = computeEnemyDamage(3, 1.5);
      applyDamageToHealth(playerHealth, damage, "bat");
      expect(playerHealth.current).toBeCloseTo(15.5);
    });

    it("player is invulnerable to follow-up hit within invuln window", () => {
      const playerHealth = makeHealth(20, 20);
      applyDamageToHealth(playerHealth, 5, "bat");
      const hpAfterFirst = playerHealth.current; // 15

      // Second hit in same frame — should be blocked by invuln
      applyDamageToHealth(playerHealth, 5, "bat");
      expect(playerHealth.current).toBe(hpAfterFirst);
    });

    it("player can take damage again after invuln expires", () => {
      const playerHealth = makeHealth(20, 20);
      applyDamageToHealth(playerHealth, 5, "bat");

      // Tick past invuln window
      tickInvulnFrames(playerHealth, 1.0);
      expect(playerHealth.invulnFrames).toBe(0);

      // Now second hit lands
      applyDamageToHealth(playerHealth, 5, "bat");
      expect(playerHealth.current).toBe(10);
    });
  });
});
