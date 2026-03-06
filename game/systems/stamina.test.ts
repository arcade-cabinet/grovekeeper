import type { Entity } from "@/game/ecs/world";
import { drainStamina, regenStamina } from "@/game/systems/stamina";

describe("stamina system", () => {
  // ── regenStamina ───────────────────────────────────────────────

  describe("regenStamina", () => {
    it("regenerates stamina at base rate (2/sec)", () => {
      const result = regenStamina(50, 100, 1.0);
      expect(result).toBe(52);
    });

    it("regenerates proportional to deltaTime", () => {
      const result = regenStamina(50, 100, 5.0);
      // 50 + 2 * 1.0 * 5.0 = 60
      expect(result).toBe(60);
    });

    it("applies regen multiplier", () => {
      const result = regenStamina(50, 100, 1.0, 2.0);
      // 50 + 2 * 2.0 * 1.0 = 54
      expect(result).toBe(54);
    });

    it("clamps to max stamina", () => {
      const result = regenStamina(99, 100, 5.0);
      expect(result).toBe(100);
    });

    it("returns current if already at max", () => {
      const result = regenStamina(100, 100, 10.0);
      expect(result).toBe(100);
    });

    it("returns current if above max", () => {
      const result = regenStamina(120, 100, 1.0);
      expect(result).toBe(120);
    });

    it("handles zero deltaTime", () => {
      const result = regenStamina(50, 100, 0);
      expect(result).toBe(50);
    });

    it("handles fractional deltaTime", () => {
      const result = regenStamina(50, 100, 0.5);
      // 50 + 2 * 1.0 * 0.5 = 51
      expect(result).toBe(51);
    });

    it("uses default regenMult of 1.0", () => {
      const withDefault = regenStamina(50, 100, 1.0);
      const withExplicit = regenStamina(50, 100, 1.0, 1.0);
      expect(withDefault).toBe(withExplicit);
    });

    it("handles zero regenMult", () => {
      const result = regenStamina(50, 100, 1.0, 0);
      expect(result).toBe(50);
    });
  });

  // ── drainStamina ───────────────────────────────────────────────

  describe("drainStamina", () => {
    function makeFarmerEntity(stamina: number): Entity {
      return {
        id: "farmer",
        farmerState: { stamina, maxStamina: 100 },
      };
    }

    it("drains stamina and returns true when sufficient", () => {
      const entity = makeFarmerEntity(50);
      const result = drainStamina(entity, 10);
      expect(result).toBe(true);
      expect(entity.farmerState!.stamina).toBe(40);
    });

    it("returns false when insufficient stamina", () => {
      const entity = makeFarmerEntity(5);
      const result = drainStamina(entity, 10);
      expect(result).toBe(false);
      expect(entity.farmerState!.stamina).toBe(5); // unchanged
    });

    it("drains exact amount when stamina equals cost", () => {
      const entity = makeFarmerEntity(10);
      const result = drainStamina(entity, 10);
      expect(result).toBe(true);
      expect(entity.farmerState!.stamina).toBe(0);
    });

    it("returns false when no farmerState", () => {
      const entity: Entity = { id: "no-farmer" };
      expect(drainStamina(entity, 10)).toBe(false);
    });

    it("handles zero cost", () => {
      const entity = makeFarmerEntity(50);
      const result = drainStamina(entity, 0);
      expect(result).toBe(true);
      expect(entity.farmerState!.stamina).toBe(50);
    });

    it("rejects negative stamina scenarios", () => {
      const entity = makeFarmerEntity(0);
      const result = drainStamina(entity, 5);
      expect(result).toBe(false);
      expect(entity.farmerState!.stamina).toBe(0);
    });
  });
});
