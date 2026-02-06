import { describe, it, expect, beforeEach } from "vitest";
import { movementSystem, getPlayerPosition } from "./movement";
import { world, playerQuery } from "../ecs/world";
import { createPlayerEntity } from "../ecs/archetypes";
import { GRID_SIZE, PLAYER_SPEED } from "../constants/config";

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
      player.position!.x = GRID_SIZE - 1;
      world.add(player);

      movementSystem({ x: 1, z: 0 }, 10);

      expect(player.position!.x).toBe(GRID_SIZE - 1);
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
      movementSystem({ x: 0.707, z: 0.707 }, 1);

      expect(player.position!.x).toBeCloseTo(startX + PLAYER_SPEED * 0.707, 2);
      expect(player.position!.z).toBeCloseTo(startZ + PLAYER_SPEED * 0.707, 2);
    });
  });
});
