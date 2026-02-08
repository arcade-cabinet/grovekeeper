import { describe, expect, it } from "vitest";
import {
  getSeasonalMarketEffect,
  getSeasonalSeedCostMultiplier,
  getSeasonalTradeBonus,
} from "./seasonalMarket";

describe("seasonalMarket", () => {
  describe("getSeasonalMarketEffect", () => {
    it("returns correct effect for spring", () => {
      const effect = getSeasonalMarketEffect("spring");
      expect(effect).not.toBeNull();
      expect(effect!.season).toBe("spring");
      expect(effect!.seedCostMultiplier).toBe(0.5);
    });

    it("returns correct effect for summer", () => {
      const effect = getSeasonalMarketEffect("summer");
      expect(effect).not.toBeNull();
      expect(effect!.season).toBe("summer");
      expect(effect!.tradeBonus.timber).toBe(1.5);
    });

    it("returns correct effect for autumn", () => {
      const effect = getSeasonalMarketEffect("autumn");
      expect(effect).not.toBeNull();
      expect(effect!.season).toBe("autumn");
      expect(effect!.tradeBonus.fruit).toBe(1.5);
      expect(effect!.tradeBonus.acorns).toBe(1.5);
    });

    it("returns correct effect for winter", () => {
      const effect = getSeasonalMarketEffect("winter");
      expect(effect).not.toBeNull();
      expect(effect!.season).toBe("winter");
      expect(effect!.tradeBonus.sap).toBe(1.5);
    });

    it("returns null for unknown season", () => {
      const effect = getSeasonalMarketEffect("monsoon");
      expect(effect).toBeNull();
    });
  });

  describe("getSeasonalSeedCostMultiplier", () => {
    it("spring has 0.5 seed cost multiplier", () => {
      expect(getSeasonalSeedCostMultiplier("spring")).toBe(0.5);
    });

    it("returns 1.0 for unknown season", () => {
      expect(getSeasonalSeedCostMultiplier("alien-season")).toBe(1.0);
    });

    it("returns 1.0 for summer (no seed discount)", () => {
      expect(getSeasonalSeedCostMultiplier("summer")).toBe(1.0);
    });
  });

  describe("getSeasonalTradeBonus", () => {
    it("summer has 1.5 timber trade bonus", () => {
      expect(getSeasonalTradeBonus("summer", "timber")).toBe(1.5);
    });

    it("autumn has 1.5 fruit bonus", () => {
      expect(getSeasonalTradeBonus("autumn", "fruit")).toBe(1.5);
    });

    it("autumn has 1.5 acorn bonus", () => {
      expect(getSeasonalTradeBonus("autumn", "acorns")).toBe(1.5);
    });

    it("winter has 1.5 sap bonus", () => {
      expect(getSeasonalTradeBonus("winter", "sap")).toBe(1.5);
    });

    it("returns 1.0 for unaffected resources", () => {
      expect(getSeasonalTradeBonus("spring", "timber")).toBe(1.0);
    });

    it("returns 1.0 for unknown season", () => {
      expect(getSeasonalTradeBonus("blizzard", "timber")).toBe(1.0);
    });
  });
});
