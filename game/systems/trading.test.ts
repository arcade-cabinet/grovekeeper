import type { ResourceType } from "@/game/config/resources";
import { emptyResources } from "@/game/config/resources";
import {
  BASE_TRADE_RATES,
  calculateTradeOutput,
  executeTrade,
  getEffectiveTradeRate,
  getEffectiveTradeRates,
  getTradeRates,
} from "./trading.ts";

function makeMultipliers(
  overrides: Partial<Record<ResourceType, number>> = {},
): Record<ResourceType, number> {
  return {
    timber: 1.0,
    sap: 1.0,
    fruit: 1.0,
    acorns: 1.0,
    wood: 1.0,
    stone: 1.0,
    metal_scrap: 1.0,
    fiber: 1.0,
    ore: 1.0,
    berries: 1.0,
    herbs: 1.0,
    meat: 1.0,
    hide: 1.0,
    fish: 1.0,
    seeds: 1.0,
    ...overrides,
  };
}

describe("trading system", () => {
  describe("getTradeRates", () => {
    it("returns a copy of the base trade rates", () => {
      const rates = getTradeRates();
      expect(rates).toEqual(BASE_TRADE_RATES);
      expect(rates).not.toBe(BASE_TRADE_RATES);
    });

    it("has 4 trade pairs", () => {
      expect(getTradeRates()).toHaveLength(4);
    });
  });

  describe("calculateTradeOutput", () => {
    const timberToSap = BASE_TRADE_RATES[0]; // 10 timber -> 5 sap

    it("returns correct output for exact input amount", () => {
      expect(calculateTradeOutput(timberToSap, 10)).toBe(5);
    });

    it("returns 0 if input is less than minimum", () => {
      expect(calculateTradeOutput(timberToSap, 9)).toBe(0);
    });

    it("floors partial trades", () => {
      expect(calculateTradeOutput(timberToSap, 15)).toBe(5);
    });

    it("handles multiple trade batches", () => {
      expect(calculateTradeOutput(timberToSap, 30)).toBe(15);
    });

    it("returns 0 for zero input", () => {
      expect(calculateTradeOutput(timberToSap, 0)).toBe(0);
    });

    it("returns 0 for negative input", () => {
      expect(calculateTradeOutput(timberToSap, -5)).toBe(0);
    });

    it("works for all trade pairs", () => {
      const sapToFruit = BASE_TRADE_RATES[1]; // 10 sap -> 3 fruit
      expect(calculateTradeOutput(sapToFruit, 20)).toBe(6);

      const fruitToAcorns = BASE_TRADE_RATES[2]; // 15 fruit -> 5 acorns
      expect(calculateTradeOutput(fruitToAcorns, 30)).toBe(10);

      const acornsToTimber = BASE_TRADE_RATES[3]; // 20 acorns -> 10 timber
      expect(calculateTradeOutput(acornsToTimber, 40)).toBe(20);
    });
  });

  describe("executeTrade", () => {
    const timberToSap = BASE_TRADE_RATES[0]; // 10 timber -> 5 sap

    const makeResources = (
      overrides: Partial<Record<ResourceType, number>> = {},
    ): Record<ResourceType, number> => ({ ...emptyResources(), ...overrides });

    it("returns spend and gain for a valid trade", () => {
      const result = executeTrade(timberToSap, 10, makeResources({ timber: 100 }));
      expect(result).toEqual({
        spend: { type: "timber", amount: 10 },
        gain: { type: "sap", amount: 5 },
      });
    });

    it("returns null if player cannot afford the trade", () => {
      const result = executeTrade(timberToSap, 10, makeResources({ timber: 5 }));
      expect(result).toBeNull();
    });

    it("returns null if input amount is less than minimum", () => {
      const result = executeTrade(timberToSap, 5, makeResources({ timber: 100 }));
      expect(result).toBeNull();
    });

    it("returns null for zero input", () => {
      const result = executeTrade(timberToSap, 0, makeResources({ timber: 100 }));
      expect(result).toBeNull();
    });

    it("floors to whole trade batches", () => {
      const result = executeTrade(timberToSap, 25, makeResources({ timber: 100 }));
      expect(result).toEqual({
        spend: { type: "timber", amount: 20 },
        gain: { type: "sap", amount: 10 },
      });
    });

    it("returns null when resources exactly zero", () => {
      const result = executeTrade(timberToSap, 10, makeResources({ timber: 0 }));
      expect(result).toBeNull();
    });

    it("works when resources exactly match cost", () => {
      const result = executeTrade(timberToSap, 10, makeResources({ timber: 10 }));
      expect(result).not.toBeNull();
      expect(result!.spend.amount).toBe(10);
    });
  });

  describe("getEffectiveTradeRate (Spec §20.2)", () => {
    const timberToSap = BASE_TRADE_RATES[0]; // 10 timber -> 5 sap

    it("returns base toAmount when multiplier is 1.0", () => {
      expect(getEffectiveTradeRate(timberToSap, makeMultipliers({ sap: 1.0 })).toAmount).toBe(5);
    });

    it("scales toAmount up by multiplier > 1.0", () => {
      expect(getEffectiveTradeRate(timberToSap, makeMultipliers({ sap: 2.0 })).toAmount).toBe(10);
    });

    it("scales toAmount down by multiplier < 1.0", () => {
      // 5 * 0.5 = 2.5 -> rounds to 3
      expect(getEffectiveTradeRate(timberToSap, makeMultipliers({ sap: 0.5 })).toAmount).toBe(3);
    });

    it("rounds fractional toAmount", () => {
      // 5 * 1.5 = 7.5 -> rounds to 8
      expect(getEffectiveTradeRate(timberToSap, makeMultipliers({ sap: 1.5 })).toAmount).toBe(8);
    });

    it("clamps effective toAmount to minimum of 1", () => {
      expect(getEffectiveTradeRate(timberToSap, makeMultipliers({ sap: 0.0 })).toAmount).toBe(1);
    });

    it("preserves fromAmount, from, and to unchanged", () => {
      const result = getEffectiveTradeRate(timberToSap, makeMultipliers({ sap: 2.0 }));
      expect(result.from).toBe("timber");
      expect(result.fromAmount).toBe(10);
      expect(result.to).toBe("sap");
    });

    it("defaults to multiplier 1.0 when resource not in multipliers", () => {
      expect(getEffectiveTradeRate(timberToSap, makeMultipliers()).toAmount).toBe(5);
    });
  });

  describe("getEffectiveTradeRates (Spec §20.2)", () => {
    it("applies multipliers to all rates", () => {
      const multipliers = makeMultipliers({ sap: 2.0, fruit: 0.5 });
      const result = getEffectiveTradeRates(BASE_TRADE_RATES, multipliers);
      expect(result[0].toAmount).toBe(10); // timber->sap: 5*2.0=10
      expect(result[1].toAmount).toBe(2); // sap->fruit: 3*0.5=1.5 -> rounds to 2
      expect(result[2].toAmount).toBe(5); // fruit->acorns: 5*1.0=5
      expect(result[3].toAmount).toBe(10); // acorns->timber: 10*1.0=10
    });

    it("returns same number of rates as input", () => {
      expect(getEffectiveTradeRates(BASE_TRADE_RATES, makeMultipliers())).toHaveLength(4);
    });

    it("returns identity rates when all multipliers are 1.0", () => {
      const result = getEffectiveTradeRates(BASE_TRADE_RATES, makeMultipliers());
      result.forEach((r, i) => {
        expect(r.toAmount).toBe(BASE_TRADE_RATES[i].toAmount);
      });
    });
  });
});
