import { beforeEach, describe, expect, it } from "vitest";
import { GRID_SIZE, PLAYER_SPEED } from "../constants/config";
import { createPlayerEntity } from "../ecs/archetypes";
import { world } from "../ecs/world";
import {
  getPlayerPosition,
  movementSystem,
  setMovementBounds,
} from "./movement";

describe("Movement System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("getPlayerPosition", () => {
    it("returns null when no player exists", () => {
      expect(getPlayerPosition()).toBeNull();
    });

    it("returns player position when player exists", () => {
      const player = createPlayerEntity();
      world.add(player);

      const pos = getPlayerPosition();
      expect(pos).toEqual({ x: 6, z: 6 });
    });
  });

  describe("movementSystem", () => {
    it("moves player right when x input is positive", () => {
      const player = createPlayerEntity();
      world.add(player);

      const startX = player.position!.x;
      movementSystem({ x: 1, z: 0 }, 1);

      expect(player.position!.x).toBe(startX + PLAYER_SPEED);
    });

    it("moves player left when x input is negative", () => {
      const player = createPlayerEntity();
      world.add(player);

      const startX = player.position!.x;
      movementSystem({ x: -1, z: 0 }, 1);

      expect(player.position!.x).toBe(startX - PLAYER_SPEED);
    });

    it("moves player forward when z input is positive", () => {
      const player = createPlayerEntity();
      world.add(player);

      const startZ = player.position!.z;
      movementSystem({ x: 0, z: 1 }, 1);

      expect(player.position!.z).toBe(startZ + PLAYER_SPEED);
    });

    it("clamps position to grid bounds (max)", () => {
      const player = createPlayerEntity();
      player.position!.x = GRID_SIZE;
      world.add(player);

      movementSystem({ x: 1, z: 0 }, 10);

      expect(player.position!.x).toBe(GRID_SIZE);
    });

    it("clamps position to grid bounds (min)", () => {
      const player = createPlayerEntity();
      player.position!.x = 0;
      world.add(player);

      movementSystem({ x: -1, z: 0 }, 10);

      expect(player.position!.x).toBe(0);
    });

    it("scales movement by delta time", () => {
      const player = createPlayerEntity();
      world.add(player);

      const startX = player.position!.x;
      movementSystem({ x: 1, z: 0 }, 0.5);

      expect(player.position!.x).toBe(startX + PLAYER_SPEED * 0.5);
    });

    it("handles diagonal movement", () => {
      const player = createPlayerEntity();
      world.add(player);

      const startX = player.position!.x;
      const startZ = player.position!.z;
      movementSystem({ x: Math.SQRT1_2, z: Math.SQRT1_2 }, 1);

      expect(player.position!.x).toBeCloseTo(
        startX + PLAYER_SPEED * Math.SQRT1_2,
        2,
      );
      expect(player.position!.z).toBeCloseTo(
        startZ + PLAYER_SPEED * Math.SQRT1_2,
        2,
      );
    });

    it("respects custom world bounds from setMovementBounds", () => {
      const player = createPlayerEntity();
      player.position!.x = 5;
      player.position!.z = 5;
      world.add(player);

      setMovementBounds({ minX: 2, minZ: 2, maxX: 8, maxZ: 8 });

      // Move far right — should clamp at maxX = 8
      movementSystem({ x: 1, z: 0 }, 100);
      expect(player.position!.x).toBe(8);

      // Move far left — should clamp at minX = 2
      movementSystem({ x: -1, z: 0 }, 100);
      expect(player.position!.x).toBe(2);

      // Reset to defaults for other tests
      setMovementBounds({ minX: 0, minZ: 0, maxX: GRID_SIZE, maxZ: GRID_SIZE });
    });
  });
});
