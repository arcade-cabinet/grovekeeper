import { describe, it, expect } from "vitest";
import { getZoneBonus } from "./zoneBonuses";

describe("zoneBonuses", () => {
  describe("getZoneBonus", () => {
    it("returns correct bonuses for grove zone", () => {
      const bonus = getZoneBonus("grove");
      expect(bonus.growthMultiplier).toBe(1.1);
      expect(bonus.timberYieldMultiplier).toBe(1.0);
      expect(bonus.rainChanceBonus).toBe(0);
      expect(bonus.hasTrade).toBe(false);
    });

    it("returns correct bonuses for clearing zone", () => {
      const bonus = getZoneBonus("clearing");
      expect(bonus.growthMultiplier).toBe(1.0);
      expect(bonus.timberYieldMultiplier).toBe(1.0);
      expect(bonus.rainChanceBonus).toBe(0.1);
      expect(bonus.hasTrade).toBe(false);
    });

    it("returns correct bonuses for forest zone", () => {
      const bonus = getZoneBonus("forest");
      expect(bonus.growthMultiplier).toBe(1.0);
      expect(bonus.timberYieldMultiplier).toBe(1.15);
      expect(bonus.rainChanceBonus).toBe(0);
      expect(bonus.hasTrade).toBe(false);
    });

    it("returns correct bonuses for settlement zone", () => {
      const bonus = getZoneBonus("settlement");
      expect(bonus.growthMultiplier).toBe(1.0);
      expect(bonus.timberYieldMultiplier).toBe(1.0);
      expect(bonus.rainChanceBonus).toBe(0);
      expect(bonus.hasTrade).toBe(true);
    });

    it("returns correct bonuses for path zone", () => {
      const bonus = getZoneBonus("path");
      expect(bonus.growthMultiplier).toBe(1.0);
      expect(bonus.timberYieldMultiplier).toBe(1.0);
      expect(bonus.rainChanceBonus).toBe(0);
      expect(bonus.hasTrade).toBe(false);
    });

    it("returns default bonuses for unknown zone type", () => {
      const bonus = getZoneBonus("volcano");
      expect(bonus.growthMultiplier).toBe(1.0);
      expect(bonus.timberYieldMultiplier).toBe(1.0);
      expect(bonus.rainChanceBonus).toBe(0);
      expect(bonus.hasTrade).toBe(false);
    });

    it("grove has 1.1 growth multiplier", () => {
      expect(getZoneBonus("grove").growthMultiplier).toBe(1.1);
    });

    it("forest has 1.15 timber yield", () => {
      expect(getZoneBonus("forest").timberYieldMultiplier).toBe(1.15);
    });

    it("settlement has trade access", () => {
      expect(getZoneBonus("settlement").hasTrade).toBe(true);
    });

    it("clearing has 0.1 rain chance bonus", () => {
      expect(getZoneBonus("clearing").rainChanceBonus).toBe(0.1);
    });
  });
});
