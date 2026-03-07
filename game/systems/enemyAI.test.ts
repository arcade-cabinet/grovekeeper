import {
  getScaledHealth,
  getScaledAttack,
  createAIState,
  updatePatrol,
  updateGuard,
  checkAggro,
  moveToward,
  canAttack,
} from "./enemyAI";
import type { Entity, Position } from "@/game/ecs/world";

function makeEntity(x: number, z: number): Entity {
  return {
    id: "test-enemy",
    position: { x, y: 0, z },
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
      const dist = Math.sqrt(
        (entity.position!.x - 10) ** 2 + (entity.position!.z - 10) ** 2,
      );
      expect(dist).toBeLessThan(1);
    });
  });

  describe("checkAggro", () => {
    it("switches to aggro when player is within range", () => {
      const result = checkAggro(
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        5,
        8,
        "idle",
      );
      expect(result).toBe("aggro");
    });

    it("stays idle when player is out of aggro range", () => {
      const result = checkAggro(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        5,
        8,
        "idle",
      );
      expect(result).toBe("idle");
    });

    it("returns to idle when player exits deaggro range", () => {
      const result = checkAggro(
        { x: 0, y: 0, z: 0 },
        { x: 9, y: 0, z: 0 },
        5,
        8,
        "aggro",
      );
      expect(result).toBe("returning");
    });

    it("stays aggro when player is within deaggro range", () => {
      const result = checkAggro(
        { x: 0, y: 0, z: 0 },
        { x: 7, y: 0, z: 0 },
        5,
        8,
        "aggro",
      );
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
