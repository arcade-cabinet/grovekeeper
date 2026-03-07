/**
 * Trap system tests (Spec §22 — P5 Survival Systems).
 *
 * Tests cover:
 *   - Trap placement (arms on creation)
 *   - Range detection (XZ plane)
 *   - Trigger mechanics (disarm + cooldown)
 *   - Cooldown tick and re-arm
 *   - Damage application (via combat invuln window)
 *   - Full tickTraps integration
 */

import {
  createTrapComponent,
  isEnemyInTrapRange,
  triggerTrap,
  tickTrapCooldown,
  applyTrapDamageToHealth,
  tickTraps,
} from "./traps";
import type { TrapEntity, EnemyTargetEntity } from "./traps";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHealth(current = 20, max = 20) {
  return { current, max, invulnFrames: 0, lastDamageSource: null as string | null };
}

function makeEnemy(x: number, z: number, hp = 20): EnemyTargetEntity {
  return { health: makeHealth(hp), position: { x, y: 0, z } };
}

function makeTrapEntity(trapType: string, x: number, z: number): TrapEntity {
  return { trap: createTrapComponent(trapType), position: { x, y: 0, z } };
}

// ---------------------------------------------------------------------------
// createTrapComponent
// ---------------------------------------------------------------------------

describe("createTrapComponent (Spec §22)", () => {
  it("arms the trap on placement", () => {
    const trap = createTrapComponent("spike");
    expect(trap.armed).toBe(true);
  });

  it("starts with zero cooldown", () => {
    const trap = createTrapComponent("spike");
    expect(trap.cooldown).toBe(0);
  });

  it("sets trapType correctly", () => {
    const trap = createTrapComponent("snare");
    expect(trap.trapType).toBe("snare");
  });

  it("bakes in damage from config — spike=8, snare=4, fire=12", () => {
    expect(createTrapComponent("spike").damage).toBe(8.0);
    expect(createTrapComponent("snare").damage).toBe(4.0);
    expect(createTrapComponent("fire").damage).toBe(12.0);
  });

  it("bakes in triggerRadius from config", () => {
    expect(createTrapComponent("spike").triggerRadius).toBe(1.5);
    expect(createTrapComponent("snare").triggerRadius).toBe(1.2);
    expect(createTrapComponent("fire").triggerRadius).toBe(2.0);
  });

  it("bakes in modelPath from config", () => {
    expect(createTrapComponent("spike").modelPath).toBe("assets/models/props/trap-spike.glb");
  });

  it("throws on unknown trap type", () => {
    expect(() => createTrapComponent("unknown")).toThrow('Unknown trap type: "unknown"');
  });
});

// ---------------------------------------------------------------------------
// isEnemyInTrapRange
// ---------------------------------------------------------------------------

describe("isEnemyInTrapRange (Spec §22)", () => {
  it("returns true when enemy is at the same position as the trap", () => {
    expect(isEnemyInTrapRange(0, 0, 0, 0, 1.5)).toBe(true);
  });

  it("returns true when enemy is inside radius", () => {
    expect(isEnemyInTrapRange(0, 0, 1.0, 0, 1.5)).toBe(true);
  });

  it("returns true when enemy is exactly on the radius edge", () => {
    expect(isEnemyInTrapRange(0, 0, 1.5, 0, 1.5)).toBe(true);
  });

  it("returns false when enemy is outside radius", () => {
    expect(isEnemyInTrapRange(0, 0, 2.0, 0, 1.5)).toBe(false);
  });

  it("uses 2D Euclidean distance in XZ plane (diagonal inside)", () => {
    // sqrt(1^2 + 1^2) ≈ 1.414 < 1.5 → inside
    expect(isEnemyInTrapRange(0, 0, 1.0, 1.0, 1.5)).toBe(true);
  });

  it("uses 2D Euclidean distance in XZ plane (diagonal outside)", () => {
    // sqrt(1.1^2 + 1.1^2) ≈ 1.556 > 1.5 → outside
    expect(isEnemyInTrapRange(0, 0, 1.1, 1.1, 1.5)).toBe(false);
  });

  it("works with non-origin trap positions", () => {
    expect(isEnemyInTrapRange(5, 3, 6.0, 3, 1.5)).toBe(true);
    expect(isEnemyInTrapRange(5, 3, 7.0, 3, 1.5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// triggerTrap
// ---------------------------------------------------------------------------

describe("triggerTrap (Spec §22)", () => {
  it("disarms the trap", () => {
    const trap = createTrapComponent("spike");
    triggerTrap(trap);
    expect(trap.armed).toBe(false);
  });

  it("sets cooldown to config cooldownDuration — spike=5.0s", () => {
    const trap = createTrapComponent("spike");
    triggerTrap(trap);
    expect(trap.cooldown).toBe(5.0);
  });

  it("sets cooldown to config cooldownDuration — snare=3.0s", () => {
    const trap = createTrapComponent("snare");
    triggerTrap(trap);
    expect(trap.cooldown).toBe(3.0);
  });

  it("sets cooldown to config cooldownDuration — fire=8.0s", () => {
    const trap = createTrapComponent("fire");
    triggerTrap(trap);
    expect(trap.cooldown).toBe(8.0);
  });
});

// ---------------------------------------------------------------------------
// tickTrapCooldown
// ---------------------------------------------------------------------------

describe("tickTrapCooldown (Spec §22)", () => {
  it("decrements cooldown by dt when unarmed", () => {
    const trap = createTrapComponent("spike");
    triggerTrap(trap); // cooldown=5.0, armed=false
    tickTrapCooldown(trap, 1.0);
    expect(trap.cooldown).toBe(4.0);
  });

  it("clamps cooldown to 0 (does not go negative)", () => {
    const trap = createTrapComponent("spike");
    triggerTrap(trap); // cooldown=5.0
    tickTrapCooldown(trap, 10.0);
    expect(trap.cooldown).toBe(0);
  });

  it("re-arms when cooldown reaches exactly 0", () => {
    const trap = createTrapComponent("spike");
    triggerTrap(trap); // cooldown=5.0
    tickTrapCooldown(trap, 5.0);
    expect(trap.armed).toBe(true);
  });

  it("re-arms when dt overshoots the remaining cooldown", () => {
    const trap = createTrapComponent("snare");
    triggerTrap(trap); // cooldown=3.0
    tickTrapCooldown(trap, 100.0);
    expect(trap.armed).toBe(true);
    expect(trap.cooldown).toBe(0);
  });

  it("does not tick when already armed", () => {
    const trap = createTrapComponent("spike");
    // armed=true, cooldown=0 on creation
    tickTrapCooldown(trap, 1.0);
    expect(trap.cooldown).toBe(0);
    expect(trap.armed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyTrapDamageToHealth
// ---------------------------------------------------------------------------

describe("applyTrapDamageToHealth (Spec §22)", () => {
  it("reduces enemy health by trap damage amount", () => {
    const trap = createTrapComponent("spike"); // damage=8
    const health = makeHealth(20, 20);
    applyTrapDamageToHealth(health, trap);
    expect(health.current).toBe(12);
  });

  it("clamps health to 0 when damage exceeds current health", () => {
    const trap = createTrapComponent("fire"); // damage=12
    const health = makeHealth(5, 20);
    applyTrapDamageToHealth(health, trap);
    expect(health.current).toBe(0);
  });

  it("sets lastDamageSource to trap:<trapType>", () => {
    const trap = createTrapComponent("snare");
    const health = makeHealth(20, 20);
    applyTrapDamageToHealth(health, trap);
    expect(health.lastDamageSource).toBe("trap:snare");
  });

  it("skips damage when health is in invuln window", () => {
    const trap = createTrapComponent("spike"); // damage=8
    const health = makeHealth(20, 20);
    health.invulnFrames = 0.3;
    applyTrapDamageToHealth(health, trap);
    expect(health.current).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// tickTraps — integration
// ---------------------------------------------------------------------------

describe("tickTraps (Spec §22)", () => {
  it("triggers armed trap when enemy enters radius", () => {
    const trapEntity = makeTrapEntity("spike", 0, 0);
    const enemy = makeEnemy(1.0, 0); // inside radius 1.5
    tickTraps([trapEntity], [enemy], 0.016);
    expect(trapEntity.trap.armed).toBe(false);
    expect(enemy.health.current).toBe(12); // 20 - 8
  });

  it("does not trigger when no enemies are in range", () => {
    const trapEntity = makeTrapEntity("spike", 0, 0);
    const enemy = makeEnemy(5.0, 0); // outside radius 1.5
    tickTraps([trapEntity], [enemy], 0.016);
    expect(trapEntity.trap.armed).toBe(true);
    expect(enemy.health.current).toBe(20);
  });

  it("ticks cooldown for unarmed traps", () => {
    const trapEntity = makeTrapEntity("spike", 0, 0);
    triggerTrap(trapEntity.trap); // cooldown=5.0, armed=false
    tickTraps([trapEntity], [], 1.0);
    expect(trapEntity.trap.cooldown).toBe(4.0);
  });

  it("re-arms trap when cooldown completes", () => {
    const trapEntity = makeTrapEntity("snare", 0, 0);
    triggerTrap(trapEntity.trap); // cooldown=3.0
    tickTraps([trapEntity], [], 3.0);
    expect(trapEntity.trap.armed).toBe(true);
  });

  it("hits only the first enemy in range per tick (break after trigger)", () => {
    const trapEntity = makeTrapEntity("spike", 0, 0);
    const e1 = makeEnemy(0.5, 0); // in range
    const e2 = makeEnemy(0.3, 0); // also in range
    tickTraps([trapEntity], [e1, e2], 0.016);
    // trap triggers on e1, breaks — e2 is not hit
    expect(e1.health.current).toBe(12); // 20 - 8
    expect(e2.health.current).toBe(20); // untouched
    expect(trapEntity.trap.armed).toBe(false);
  });

  it("handles multiple traps independently", () => {
    const t1 = makeTrapEntity("spike", 0, 0);
    const t2 = makeTrapEntity("snare", 10, 10);
    const e1 = makeEnemy(0.5, 0);   // in t1 range, not t2
    const e2 = makeEnemy(10.5, 10); // in t2 range, not t1
    tickTraps([t1, t2], [e1, e2], 0.016);
    expect(t1.trap.armed).toBe(false);
    expect(t2.trap.armed).toBe(false);
    expect(e1.health.current).toBe(12); // 20 - 8 (spike)
    expect(e2.health.current).toBe(16); // 20 - 4 (snare)
  });

  it("does not damage enemy when trap is on cooldown", () => {
    const trapEntity = makeTrapEntity("spike", 0, 0);
    triggerTrap(trapEntity.trap); // armed=false, cooldown=5.0
    const enemy = makeEnemy(0.5, 0); // in range but trap is disarmed
    tickTraps([trapEntity], [enemy], 0.016);
    expect(enemy.health.current).toBe(20); // no damage
  });

  it("handles empty traps and enemies arrays without error", () => {
    expect(() => tickTraps([], [], 0.016)).not.toThrow();
  });
});
