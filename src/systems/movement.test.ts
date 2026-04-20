import { beforeEach, describe, expect, it } from "vitest";
import { GRID_SIZE, PLAYER_SPEED } from "@/config/config";
import { destroyAllEntitiesExceptWorld, spawnPlayer } from "@/koota";
import { Position } from "@/traits";
import {
  getPlayerPosition,
  movementSystem,
  setMovementBounds,
} from "./movement";

describe("Movement System", () => {
  beforeEach(() => {
    destroyAllEntitiesExceptWorld();
  });

  describe("getPlayerPosition", () => {
    it("returns null when no player exists", () => {
      expect(getPlayerPosition()).toBeNull();
    });

    it("returns player position when player exists", () => {
      spawnPlayer();
      const pos = getPlayerPosition();
      expect(pos).toEqual({ x: 6, z: 6 });
    });
  });

  describe("movementSystem", () => {
    it("moves player right when x input is positive", () => {
      const player = spawnPlayer();
      const startX = player.get(Position).x;
      movementSystem({ x: 1, z: 0 }, 1);
      expect(player.get(Position).x).toBe(startX + PLAYER_SPEED);
    });

    it("moves player left when x input is negative", () => {
      const player = spawnPlayer();
      const startX = player.get(Position).x;
      movementSystem({ x: -1, z: 0 }, 1);
      expect(player.get(Position).x).toBe(startX - PLAYER_SPEED);
    });

    it("moves player forward when z input is positive", () => {
      const player = spawnPlayer();
      const startZ = player.get(Position).z;
      movementSystem({ x: 0, z: 1 }, 1);
      expect(player.get(Position).z).toBe(startZ + PLAYER_SPEED);
    });

    it("clamps position to grid bounds (max)", () => {
      const player = spawnPlayer();
      player.set(Position, { x: GRID_SIZE, y: 0, z: 6 });
      movementSystem({ x: 1, z: 0 }, 10);
      expect(player.get(Position).x).toBe(GRID_SIZE);
    });

    it("clamps position to grid bounds (min)", () => {
      const player = spawnPlayer();
      player.set(Position, { x: 0, y: 0, z: 6 });
      movementSystem({ x: -1, z: 0 }, 10);
      expect(player.get(Position).x).toBe(0);
    });

    it("scales movement by delta time", () => {
      const player = spawnPlayer();
      const startX = player.get(Position).x;
      movementSystem({ x: 1, z: 0 }, 0.5);
      expect(player.get(Position).x).toBe(startX + PLAYER_SPEED * 0.5);
    });

    it("handles diagonal movement", () => {
      const player = spawnPlayer();
      const { x: startX, z: startZ } = player.get(Position);
      movementSystem({ x: Math.SQRT1_2, z: Math.SQRT1_2 }, 1);
      const pos = player.get(Position);
      expect(pos.x).toBeCloseTo(startX + PLAYER_SPEED * Math.SQRT1_2, 2);
      expect(pos.z).toBeCloseTo(startZ + PLAYER_SPEED * Math.SQRT1_2, 2);
    });

    it("respects custom world bounds from setMovementBounds", () => {
      const player = spawnPlayer();
      player.set(Position, { x: 5, y: 0, z: 5 });

      setMovementBounds({ minX: 2, minZ: 2, maxX: 8, maxZ: 8 });

      // Move far right — should clamp at maxX = 8
      movementSystem({ x: 1, z: 0 }, 100);
      expect(player.get(Position).x).toBe(8);

      // Move far left — should clamp at minX = 2
      movementSystem({ x: -1, z: 0 }, 100);
      expect(player.get(Position).x).toBe(2);

      // Reset to defaults for other tests
      setMovementBounds({ minX: 0, minZ: 0, maxX: GRID_SIZE, maxZ: GRID_SIZE });
    });
  });
});

