import type { Season } from "./seasonalMarket";
import { applySeasonalPrice, getResourceModifier, getSeasonalModifiers } from "./seasonalMarket";

describe("seasonal market", () => {
  describe("getSeasonalModifiers", () => {
    it("returns modifiers for spring", () => {
      const mods = getSeasonalModifiers("spring");
      expect(mods).toEqual({ timber: 1.0, sap: 1.2, fruit: 0.8, acorns: 1.0 });
    });

    it("returns modifiers for summer", () => {
      const mods = getSeasonalModifiers("summer");
      expect(mods).toEqual({ timber: 0.8, sap: 1.0, fruit: 1.2, acorns: 1.0 });
    });

    it("returns modifiers for autumn", () => {
      const mods = getSeasonalModifiers("autumn");
      expect(mods).toEqual({ timber: 1.2, sap: 0.8, fruit: 1.5, acorns: 1.3 });
    });

    it("returns modifiers for winter", () => {
      const mods = getSeasonalModifiers("winter");
      expect(mods).toEqual({ timber: 1.5, sap: 0.6, fruit: 0.5, acorns: 1.5 });
    });

    it("returns a copy (not the original reference)", () => {
      const a = getSeasonalModifiers("spring");
      const b = getSeasonalModifiers("spring");
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe("getResourceModifier", () => {
    it("returns correct modifier for sap in spring", () => {
      expect(getResourceModifier("spring", "sap")).toBe(1.2);
    });

    it("returns correct modifier for fruit in winter", () => {
      expect(getResourceModifier("winter", "fruit")).toBe(0.5);
    });

    it("returns correct modifier for timber in autumn", () => {
      expect(getResourceModifier("autumn", "timber")).toBe(1.2);
    });

    it("returns 1.0 for neutral modifiers", () => {
      expect(getResourceModifier("spring", "timber")).toBe(1.0);
    });
  });

  describe("applySeasonalPrice", () => {
    it("applies seasonal modifier to a base price", () => {
      // base 10, sap in spring = 1.2 -> 12
      expect(applySeasonalPrice(10, "spring", "sap")).toBe(12);
    });

    it("rounds to one decimal place", () => {
      // base 7, fruit in autumn = 1.5 -> 10.5
      expect(applySeasonalPrice(7, "autumn", "fruit")).toBe(10.5);
    });

    it("handles zero base price", () => {
      expect(applySeasonalPrice(0, "winter", "timber")).toBe(0);
    });

    it("applies reduction modifier correctly", () => {
      // base 10, fruit in spring = 0.8 -> 8
      expect(applySeasonalPrice(10, "spring", "fruit")).toBe(8);
    });

    it("applies winter timber boost correctly", () => {
      // base 10, timber in winter = 1.5 -> 15
      expect(applySeasonalPrice(10, "winter", "timber")).toBe(15);
    });

    it("applies all seasons for acorns", () => {
      const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
      const expected = [10, 10, 13, 15]; // base 10 * each modifier
      seasons.forEach((season, i) => {
        expect(applySeasonalPrice(10, season, "acorns")).toBe(expected[i]);
      });
    });
  });
});
