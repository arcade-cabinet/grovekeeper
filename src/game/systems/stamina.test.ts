import { describe, it, expect, beforeEach } from "vitest";
import { staminaSystem, drainStamina } from "./stamina";
import { world, type Entity } from "../ecs/world";
import { createPlayerEntity } from "../ecs/archetypes";
import { useGameStore } from "../stores/gameStore";

describe("Stamina System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
    useGameStore.getState().resetGame();
  });

  describe("staminaSystem (regen)", () => {
    it("regenerates stamina at 2/sec", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 90;
      world.add(player);

      staminaSystem(1); // 1 second

      expect(player.farmerState!.stamina).toBe(92);
    });

    it("caps stamina at maxStamina", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 99;
      world.add(player);

      staminaSystem(5); // 5 seconds = +10, but capped at 100

      expect(player.farmerState!.stamina).toBe(100);
    });

    it("does not change stamina if already full", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 100;
      world.add(player);

      staminaSystem(1);

      expect(player.farmerState!.stamina).toBe(100);
    });
  });

  describe("drainStamina", () => {
    it("returns true and drains if enough stamina", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 50;
      world.add(player);

      const success = drainStamina(player, 10);

      expect(success).toBe(true);
      expect(player.farmerState!.stamina).toBe(40);
    });

    it("returns false if insufficient stamina", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 3;
      world.add(player);

      const success = drainStamina(player, 5);

      expect(success).toBe(false);
      expect(player.farmerState!.stamina).toBe(3); // unchanged
    });

    it("allows exact drain (stamina == cost)", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 10;
      world.add(player);

      const success = drainStamina(player, 10);

      expect(success).toBe(true);
      expect(player.farmerState!.stamina).toBe(0);
    });

    it("returns false for entity without farmerState", () => {
      const entity = { position: { x: 0, z: 0 } } as Entity;
      const success = drainStamina(entity, 10);
      expect(success).toBe(false);
    });

    it("drains to zero and reports success", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 5;
      world.add(player);

      const success = drainStamina(player, 5);
      expect(success).toBe(true);
      expect(player.farmerState!.stamina).toBe(0);
    });

    it("zero cost drain always succeeds", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 0;
      world.add(player);

      const success = drainStamina(player, 0);
      expect(success).toBe(true);
      expect(player.farmerState!.stamina).toBe(0);
    });
  });

  describe("difficulty-scaled stamina regen", () => {
    it("explore difficulty (1.5x) regenerates faster", () => {
      useGameStore.setState({ difficulty: "explore" });
      const player = createPlayerEntity();
      player.farmerState!.stamina = 50;
      world.add(player);
      staminaSystem(1);
      const exploreStamina = player.farmerState!.stamina;

      for (const entity of [...world]) world.remove(entity);
      useGameStore.setState({ difficulty: "normal" });
      const player2 = createPlayerEntity();
      player2.farmerState!.stamina = 50;
      world.add(player2);
      staminaSystem(1);
      const normalStamina = player2.farmerState!.stamina;

      expect(exploreStamina - 50).toBeCloseTo((normalStamina - 50) * 1.5, 1);
    });

    it("ultra-brutal difficulty (0.4x) regenerates slower", () => {
      useGameStore.setState({ difficulty: "ultra-brutal" });
      const player = createPlayerEntity();
      player.farmerState!.stamina = 50;
      world.add(player);
      staminaSystem(1);
      const brutalStamina = player.farmerState!.stamina;

      for (const entity of [...world]) world.remove(entity);
      useGameStore.setState({ difficulty: "normal" });
      const player2 = createPlayerEntity();
      player2.farmerState!.stamina = 50;
      world.add(player2);
      staminaSystem(1);
      const normalStamina = player2.farmerState!.stamina;

      expect(brutalStamina - 50).toBeCloseTo((normalStamina - 50) * 0.4, 1);
    });
  });

  describe("edge cases", () => {
    it("zero deltaTime does not change stamina", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 50;
      world.add(player);
      staminaSystem(0);
      expect(player.farmerState!.stamina).toBe(50);
    });

    it("very large deltaTime does not overshoot max", () => {
      const player = createPlayerEntity();
      player.farmerState!.stamina = 99;
      world.add(player);
      staminaSystem(1000);
      expect(player.farmerState!.stamina).toBe(100);
    });
  });
});
