import { describe, it, expect, beforeEach } from "vitest";
import { staminaSystem, drainStamina } from "./stamina";
import { world } from "../ecs/world";
import { createPlayerEntity } from "../ecs/archetypes";

describe("Stamina System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
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
  });
});
