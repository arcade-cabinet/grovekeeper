/**
 * Player Attack Wiring tests — Spec §34.4.6
 *
 * Tests the integration between:
 * - resolveAction: melee tool + "enemy" target -> ATTACK
 * - resolvePlayerAttack: tool eligibility guard
 * - dispatchAction ATTACK case: ECS enemy lookup + damage application
 * - tickPlayerAttackCooldown: player cooldown is ticked each frame
 *
 * Individual pure function tests are in playerAttack.test.ts.
 */

// Mock AudioManager to avoid Tone.js ESM import in Jest
jest.mock("@/game/systems/AudioManager", () => ({
  audioManager: { playSound: jest.fn() },
  startAudio: jest.fn().mockResolvedValue(undefined),
}));

// Mock haptics — no hardware access in unit tests
jest.mock("@/game/systems/haptics", () => ({
  triggerActionHaptic: jest.fn().mockResolvedValue(undefined),
}));

// Mock game actions
jest.mock("@/game/actions", () => ({
  harvestTree: jest.fn(() => [{ type: "timber", amount: 2 }]),
  waterTree: jest.fn(() => true),
  pruneTree: jest.fn(() => true),
  plantTree: jest.fn(() => true),
  clearRock: jest.fn(() => true),
  fertilizeTree: jest.fn(() => true),
}));

// Mock store — provide stamina + difficulty needed by ATTACK case
const mockSetStamina = jest.fn();
jest.mock("@/game/stores", () => ({
  useGameStore: {
    getState: () => ({
      stamina: 100,
      maxStamina: 100,
      difficulty: "sapling",
      worldSeed: "test-seed",
      currentZoneId: "starting-grove",
      setActiveCraftingStation: jest.fn(),
      setStamina: mockSetStamina,
      addResource: jest.fn(),
      incrementToolUse: jest.fn(),
      advanceTutorial: jest.fn(),
    }),
  },
}));

// Mock difficulty config — sapling has damageMultiplier=1.0
jest.mock("@/game/config/difficulty", () => ({
  getDifficultyById: jest.fn((id: string) => {
    const configs: Record<string, { damageMultiplier: number }> = {
      sapling: { damageMultiplier: 1.0 },
      hardwood: { damageMultiplier: 1.3 },
      ironwood: { damageMultiplier: 2.0 },
      seedling: { damageMultiplier: 0 },
    };
    return configs[id] ?? { damageMultiplier: 1.0 };
  }),
}));

import {
  _playerCombatRef,
  resetPlayerAttackCooldown,
  resolveAction,
  tickPlayerAttackCooldown,
} from "@/game/actions/actionDispatcher";
import type { HealthComponent } from "@/game/ecs/components/combat";

// ---------------------------------------------------------------------------
// resolveAction — ATTACK action resolution (Spec §34.4.6)
// ---------------------------------------------------------------------------

describe("resolveAction — ATTACK resolution (Spec §34.4.6)", () => {
  it('resolves axe + enemy -> "ATTACK"', () => {
    expect(resolveAction("axe", "enemy")).toBe("ATTACK");
  });

  it('resolves pick + enemy -> "ATTACK"', () => {
    expect(resolveAction("pick", "enemy")).toBe("ATTACK");
  });

  it('resolves shovel + enemy -> "ATTACK"', () => {
    expect(resolveAction("shovel", "enemy")).toBe("ATTACK");
  });

  it('resolves pruning-shears + enemy -> "ATTACK"', () => {
    expect(resolveAction("pruning-shears", "enemy")).toBe("ATTACK");
  });

  it("returns null for watering-can + enemy (no effectPower)", () => {
    expect(resolveAction("watering-can", "enemy")).toBeNull();
  });

  it("returns null for trowel + enemy (no effectPower)", () => {
    expect(resolveAction("trowel", "enemy")).toBeNull();
  });

  it("returns null for almanac + enemy (no effectPower)", () => {
    expect(resolveAction("almanac", "enemy")).toBeNull();
  });

  it("returns CHOP not ATTACK for axe + tree (grove verb takes precedence over axe-enemy)", () => {
    // axe + tree is CHOP — the enemy check only fires for targetType="enemy"
    expect(resolveAction("axe", "tree")).toBe("CHOP");
  });

  it("returns null for axe + null (no target)", () => {
    expect(resolveAction("axe", null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// tickPlayerAttackCooldown — game loop wiring (Spec §34.4.4)
// ---------------------------------------------------------------------------

describe("tickPlayerAttackCooldown — Spec §34.4.4", () => {
  beforeEach(() => {
    resetPlayerAttackCooldown();
  });

  it("does nothing when cooldown is already 0", () => {
    tickPlayerAttackCooldown(0.016);
    expect(_playerCombatRef.cooldownRemaining).toBe(0);
  });

  it("decrements cooldown by dt", () => {
    _playerCombatRef.cooldownRemaining = 0.6;
    tickPlayerAttackCooldown(0.016);
    expect(_playerCombatRef.cooldownRemaining).toBeCloseTo(0.584);
  });

  it("clamps to 0 (never negative)", () => {
    _playerCombatRef.cooldownRemaining = 0.01;
    tickPlayerAttackCooldown(0.5);
    expect(_playerCombatRef.cooldownRemaining).toBe(0);
  });

  it("resets to 0 via resetPlayerAttackCooldown", () => {
    _playerCombatRef.cooldownRemaining = 0.4;
    resetPlayerAttackCooldown();
    expect(_playerCombatRef.cooldownRemaining).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// _playerCombatRef — module-scope cooldown ref (Spec §34.4.4)
// ---------------------------------------------------------------------------

describe("_playerCombatRef — Spec §34.4.4", () => {
  it("has playerAttackCooldown from combat.json (0.6s)", () => {
    expect(_playerCombatRef.attackCooldown).toBeCloseTo(0.6);
  });

  it("starts with cooldownRemaining = 0 (after reset)", () => {
    resetPlayerAttackCooldown();
    expect(_playerCombatRef.cooldownRemaining).toBe(0);
  });

  it("has attackRange matching combat.json playerAttackRange (6.0)", () => {
    expect(_playerCombatRef.attackRange).toBeCloseTo(6.0);
  });
});

// ---------------------------------------------------------------------------
// TargetEntityType includes "enemy" (Spec §34.4.6)
// ---------------------------------------------------------------------------

describe("TargetEntityType includes enemy (Spec §34.4.6)", () => {
  it("resolveAction accepts 'enemy' as a valid target type without TypeScript errors", () => {
    // This test confirms the type union is correct at runtime
    const result = resolveAction("axe", "enemy");
    expect(typeof result).toBe("string");
    expect(result).toBe("ATTACK");
  });

  it("resolveAction returns null for 'npc' target with any tool (NPCs not attackable)", () => {
    expect(resolveAction("axe", "npc")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ATTACK → executePlayerAttack integration (Spec §34.4.1)
// Tests executePlayerAttack logic via dispatchAction ATTACK case indirectly,
// since dispatchAction needs ECS world which isn't set up in unit tests.
// The pure unit tests in playerAttack.test.ts cover all formulas.
// ---------------------------------------------------------------------------

describe("executePlayerAttack applied to a mock health object (Spec §34.4.1)", () => {
  beforeEach(() => {
    resetPlayerAttackCooldown();
  });

  it("applies 5 damage (axe, sapling mult=1.0) to a health component", () => {
    const { executePlayerAttack } = jest.requireActual<
      typeof import("@/game/systems/playerAttack")
    >("@/game/systems/playerAttack");

    const health: HealthComponent = {
      current: 10,
      max: 10,
      invulnFrames: 0,
      lastDamageSource: null,
    };
    const result = executePlayerAttack({
      toolId: "axe",
      damageMultiplier: 1.0,
      stamina: 100,
      maxStamina: 100,
      targetHealth: health,
      playerCombat: _playerCombatRef,
    });

    expect(result.hit).toBe(true);
    expect(result.damage).toBe(5);
    expect(health.current).toBe(5);
  });

  it("sets _playerCombatRef.cooldownRemaining after a successful hit", () => {
    const { executePlayerAttack } = jest.requireActual<
      typeof import("@/game/systems/playerAttack")
    >("@/game/systems/playerAttack");

    const health: HealthComponent = {
      current: 10,
      max: 10,
      invulnFrames: 0,
      lastDamageSource: null,
    };
    executePlayerAttack({
      toolId: "axe",
      damageMultiplier: 1.0,
      stamina: 100,
      maxStamina: 100,
      targetHealth: health,
      playerCombat: _playerCombatRef,
    });

    expect(_playerCombatRef.cooldownRemaining).toBeCloseTo(0.6);
  });
});
