import type { Entity, Position } from "@/game/ecs/world";
import {
  canAttack,
  checkAggro,
  createAIState,
  EnemyBrain,
  type EnemyBrainContext,
  EnemyEntityManager,
  getScaledAttack,
  getScaledHealth,
  moveToward,
  updateGuard,
  updatePatrol,
} from "./enemyAI.ts";

function makeEntity(x: number, z: number): Entity {
  return {
    id: "test-enemy",
    position: { x, y: 0, z },
  };
}

function makeCtx(overrides: Partial<EnemyBrainContext> = {}): EnemyBrainContext {
  return {
    playerX: 20,
    playerZ: 20,
    enemyX: 0,
    enemyZ: 0,
    homeX: 0,
    homeZ: 0,
    aggroRange: 8,
    deaggroRange: 12,
    ...overrides,
  };
}

describe("Enemy AI System", () => {
  describe("getScaledHealth", () => {
    it("returns base health at tier 1", () => {
      expect(getScaledHealth(10, 1)).toBe(10);
    });

    it("scales health up at higher tiers", () => {
      expect(getScaledHealth(10, 3)).toBeGreaterThan(10);
    });
  });

  describe("getScaledAttack", () => {
    it("returns base attack at tier 1", () => {
      expect(getScaledAttack(5, 1)).toBe(5);
    });

    it("scales attack up at higher tiers", () => {
      expect(getScaledAttack(5, 3)).toBeGreaterThan(5);
    });
  });

  describe("createAIState", () => {
    it("creates idle state at home position", () => {
      const ai = createAIState(10, 20);
      expect(ai.mode).toBe("idle");
      expect(ai.homeX).toBe(10);
      expect(ai.homeZ).toBe(20);
    });
  });

  describe("updatePatrol", () => {
    it("moves entity around home position", () => {
      const entity = makeEntity(5, 5);
      const ai = createAIState(5, 5);
      updatePatrol(entity, ai, 1.0, 1.0, 3.0);
      expect(entity.position!.x).not.toBe(5);
    });
  });

  describe("updateGuard", () => {
    it("sways entity near home position", () => {
      const entity = makeEntity(10, 10);
      const ai = createAIState(10, 10);
      updateGuard(entity, ai, 0.5, 2.0);
      const dist = Math.sqrt((entity.position!.x - 10) ** 2 + (entity.position!.z - 10) ** 2);
      expect(dist).toBeLessThan(1);
    });
  });

  describe("checkAggro", () => {
    it("switches to aggro when player is within range", () => {
      const result = checkAggro({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, 5, 8, "idle");
      expect(result).toBe("aggro");
    });

    it("stays idle when player is out of aggro range", () => {
      const result = checkAggro({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, 5, 8, "idle");
      expect(result).toBe("idle");
    });

    it("returns to idle when player exits deaggro range", () => {
      const result = checkAggro({ x: 0, y: 0, z: 0 }, { x: 9, y: 0, z: 0 }, 5, 8, "aggro");
      expect(result).toBe("returning");
    });

    it("stays aggro when player is within deaggro range", () => {
      const result = checkAggro({ x: 0, y: 0, z: 0 }, { x: 7, y: 0, z: 0 }, 5, 8, "aggro");
      expect(result).toBe("aggro");
    });
  });

  describe("moveToward", () => {
    it("moves entity toward target", () => {
      const entity = makeEntity(0, 0);
      moveToward(entity, 10, 0, 5, 1.0);
      expect(entity.position!.x).toBeGreaterThan(0);
    });

    it("returns true when reached target", () => {
      const entity = makeEntity(9.95, 0);
      const reached = moveToward(entity, 10, 0, 5, 1.0);
      expect(reached).toBe(true);
    });
  });

  describe("canAttack", () => {
    it("returns true when in range and off cooldown", () => {
      const pos: Position = { x: 0, y: 0, z: 0 };
      const target: Position = { x: 1, y: 0, z: 0 };
      expect(canAttack(pos, target, 2, 0)).toBe(true);
    });

    it("returns false when on cooldown", () => {
      const pos: Position = { x: 0, y: 0, z: 0 };
      const target: Position = { x: 1, y: 0, z: 0 };
      expect(canAttack(pos, target, 2, 1.5)).toBe(false);
    });

    it("returns false when out of range", () => {
      const pos: Position = { x: 0, y: 0, z: 0 };
      const target: Position = { x: 10, y: 0, z: 0 };
      expect(canAttack(pos, target, 2, 0)).toBe(false);
    });
  });
});

describe("EnemyBrain (Yuka GoalEvaluator-backed)", () => {
  describe("construction", () => {
    it("starts in idle mode", () => {
      const brain = new EnemyBrain("e1", "bat", "swarm");
      expect(brain.getMode()).toBe("idle");
    });

    it("exposes entityId, enemyType, behavior", () => {
      const brain = new EnemyBrain("e2", "knight", "patrol");
      expect(brain.entityId).toBe("e2");
      expect(brain.enemyType).toBe("knight");
      expect(brain.behavior).toBe("patrol");
    });
  });

  describe("patrol behavior", () => {
    it("stays idle when player is far beyond aggro range", () => {
      const brain = new EnemyBrain("e3", "knight", "patrol");
      const mode = brain.update(0.016, makeCtx({ playerX: 100, playerZ: 100 }));
      expect(mode).toBe("idle");
    });

    it("switches to aggro when player enters aggro range", () => {
      const brain = new EnemyBrain("e4", "knight", "patrol");
      // Player at distance 5 with aggroRange 8 → aggro
      const mode = brain.update(0.016, makeCtx({ playerX: 5, playerZ: 0, aggroRange: 8 }));
      expect(mode).toBe("aggro");
    });

    it("stays aggro while player is within deaggro range", () => {
      const brain = new EnemyBrain("e5", "knight", "patrol");
      // First update: trigger aggro
      brain.update(0.016, makeCtx({ playerX: 5, playerZ: 0, aggroRange: 8, deaggroRange: 12 }));
      // Second update: player still within deaggro range (dist=10, deaggro=12)
      const mode = brain.update(
        0.016,
        makeCtx({ playerX: 10, playerZ: 0, aggroRange: 8, deaggroRange: 12 }),
      );
      expect(mode).toBe("aggro");
    });

    it("switches to returning when player exits deaggro range", () => {
      const brain = new EnemyBrain("e6", "knight", "patrol");
      // Trigger aggro first
      brain.update(0.016, makeCtx({ playerX: 5, playerZ: 0, aggroRange: 8, deaggroRange: 12 }));
      // Player now beyond deaggro range
      const mode = brain.update(
        0.016,
        makeCtx({ playerX: 15, playerZ: 0, aggroRange: 8, deaggroRange: 12 }),
      );
      expect(mode).toBe("returning");
    });
  });

  describe("swarm behavior", () => {
    it("aggros at 1.2x the standard range", () => {
      const brain = new EnemyBrain("e7", "bat", "swarm");
      // Standard aggroRange=8; swarm effective=9.6; player at dist=9 → should aggro
      const mode = brain.update(0.016, makeCtx({ playerX: 9, playerZ: 0, aggroRange: 8 }));
      expect(mode).toBe("aggro");
    });

    it("does not aggro when beyond swarm effective range", () => {
      const brain = new EnemyBrain("e8", "bat", "swarm");
      // Swarm effective=9.6; player at dist=10 → no aggro
      const mode = brain.update(0.016, makeCtx({ playerX: 10, playerZ: 0, aggroRange: 8 }));
      expect(mode).toBe("idle");
    });
  });

  describe("ambush behavior", () => {
    it("stays idle when player is at standard range (outside ambush zone)", () => {
      const brain = new EnemyBrain("e9", "corrupted-hedge", "ambush");
      // Ambush effective=4; player at dist=5 → no aggro (outside half range)
      const mode = brain.update(0.016, makeCtx({ playerX: 5, playerZ: 0, aggroRange: 8 }));
      expect(mode).toBe("idle");
    });

    it("aggros when player is within ambush zone (half aggro range)", () => {
      const brain = new EnemyBrain("e10", "corrupted-hedge", "ambush");
      // Ambush effective=4; player at dist=3 → aggro
      const mode = brain.update(0.016, makeCtx({ playerX: 3, playerZ: 0, aggroRange: 8 }));
      expect(mode).toBe("aggro");
    });
  });

  describe("guard behavior", () => {
    it("aggros at standard range (same as patrol)", () => {
      const brain = new EnemyBrain("e11", "skeleton-warrior", "guard");
      const mode = brain.update(0.016, makeCtx({ playerX: 6, playerZ: 0, aggroRange: 8 }));
      expect(mode).toBe("aggro");
    });
  });

  describe("dispose", () => {
    it("resets mode to idle", () => {
      const brain = new EnemyBrain("e12", "knight", "patrol");
      brain.update(0.016, makeCtx({ playerX: 5, playerZ: 0, aggroRange: 8 }));
      expect(brain.getMode()).toBe("aggro");
      brain.dispose();
      expect(brain.getMode()).toBe("idle");
    });
  });
});

describe("EnemyEntityManager", () => {
  beforeEach(() => {
    EnemyEntityManager.clear();
  });

  it("registers and retrieves a brain", () => {
    const brain = new EnemyBrain("m1", "bat", "swarm");
    EnemyEntityManager.register(brain);
    expect(EnemyEntityManager.get("m1")).toBe(brain);
  });

  it("size reflects registered brains", () => {
    EnemyEntityManager.register(new EnemyBrain("m2", "bat", "swarm"));
    EnemyEntityManager.register(new EnemyBrain("m3", "knight", "patrol"));
    expect(EnemyEntityManager.size).toBe(2);
  });

  it("remove disposes and deletes brain", () => {
    const brain = new EnemyBrain("m4", "bat", "swarm");
    EnemyEntityManager.register(brain);
    EnemyEntityManager.remove("m4");
    expect(EnemyEntityManager.get("m4")).toBeUndefined();
    expect(EnemyEntityManager.size).toBe(0);
  });

  it("updateAll calls update on registered brains", () => {
    const brain = new EnemyBrain("m5", "knight", "patrol");
    EnemyEntityManager.register(brain);
    EnemyEntityManager.updateAll(0.016, () => makeCtx({ playerX: 5, playerZ: 0, aggroRange: 8 }));
    expect(brain.getMode()).toBe("aggro");
  });

  it("updateAll skips brains when getCtx returns null", () => {
    const brain = new EnemyBrain("m6", "knight", "patrol");
    EnemyEntityManager.register(brain);
    EnemyEntityManager.updateAll(0.016, () => null);
    expect(brain.getMode()).toBe("idle");
  });

  it("clear removes all brains", () => {
    EnemyEntityManager.register(new EnemyBrain("m7", "bat", "swarm"));
    EnemyEntityManager.register(new EnemyBrain("m8", "bat", "swarm"));
    EnemyEntityManager.clear();
    expect(EnemyEntityManager.size).toBe(0);
  });
});
