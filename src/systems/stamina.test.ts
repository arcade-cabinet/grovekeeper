import { beforeEach, describe, expect, it } from "vitest";
import {
  destroyAllEntitiesExceptWorld,
  koota,
  spawnPlayer,
} from "@/koota";
import { Difficulty, FarmerState, IsPlayer } from "@/traits";
import { drainStamina, staminaSystem } from "./stamina";

function resetWorld(): void {
  destroyAllEntitiesExceptWorld();
  // Reset Difficulty so a prior test's override doesn't leak.
  koota.set(Difficulty, { id: "normal", permadeath: false });
}

describe("Stamina System", () => {
  beforeEach(() => {
    resetWorld();
  });

  describe("staminaSystem (regen)", () => {
    it("regenerates stamina at 2/sec", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 90, maxStamina: 100 });

      staminaSystem(1); // 1 second

      expect(player.get(FarmerState).stamina).toBe(92);
    });

    it("caps stamina at maxStamina", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 99, maxStamina: 100 });

      staminaSystem(5); // 5 seconds = +10, but capped at 100

      expect(player.get(FarmerState).stamina).toBe(100);
    });

    it("does not change stamina if already full", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 100, maxStamina: 100 });

      staminaSystem(1);

      expect(player.get(FarmerState).stamina).toBe(100);
    });
  });

  describe("drainStamina", () => {
    it("returns true and drains if enough stamina", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 50, maxStamina: 100 });

      const success = drainStamina(player, 10);

      expect(success).toBe(true);
      expect(player.get(FarmerState).stamina).toBe(40);
    });

    it("returns false if insufficient stamina", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 3, maxStamina: 100 });

      const success = drainStamina(player, 5);

      expect(success).toBe(false);
      expect(player.get(FarmerState).stamina).toBe(3); // unchanged
    });

    it("allows exact drain (stamina == cost)", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 10, maxStamina: 100 });

      const success = drainStamina(player, 10);

      expect(success).toBe(true);
      expect(player.get(FarmerState).stamina).toBe(0);
    });

    it("returns false for entity without FarmerState", () => {
      // Spawn a naked entity — IsPlayer alone, no FarmerState
      const entity = koota.spawn(IsPlayer);
      const success = drainStamina(entity, 10);
      expect(success).toBe(false);
    });

    it("drains to zero and reports success", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 5, maxStamina: 100 });

      const success = drainStamina(player, 5);
      expect(success).toBe(true);
      expect(player.get(FarmerState).stamina).toBe(0);
    });

    it("zero cost drain always succeeds", () => {
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 0, maxStamina: 100 });

      const success = drainStamina(player, 0);
      expect(success).toBe(true);
      expect(player.get(FarmerState).stamina).toBe(0);
    });
  });

  describe("difficulty-scaled stamina regen", () => {
    it("explore difficulty (1.5x) regenerates faster", () => {
      koota.set(Difficulty, { id: "explore", permadeath: false });
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 50, maxStamina: 100 });

      staminaSystem(1);
      // 2/sec * 1.5x = 3 per second
      expect(player.get(FarmerState).stamina).toBe(53);
    });

    it("normal difficulty (1.0x) regenerates at base rate", () => {
      koota.set(Difficulty, { id: "normal", permadeath: false });
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 50, maxStamina: 100 });

      staminaSystem(1);
      expect(player.get(FarmerState).stamina).toBe(52);
    });

    it("ultra-brutal difficulty regenerates slowest (0.4x regen)", () => {
      koota.set(Difficulty, { id: "ultra-brutal", permadeath: false });
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 50, maxStamina: 100 });

      staminaSystem(1);
      // 2/sec * 0.4x = 0.8 per second
      expect(player.get(FarmerState).stamina).toBeCloseTo(50.8, 2);
    });

    it("hard difficulty regenerates slower (0.8x regen)", () => {
      koota.set(Difficulty, { id: "hard", permadeath: false });
      const player = spawnPlayer();
      player.set(FarmerState, { stamina: 50, maxStamina: 100 });

      staminaSystem(1);
      // 2/sec * 0.8x = 1.6 per second
      expect(player.get(FarmerState).stamina).toBeCloseTo(51.6, 2);
    });
  });
});
