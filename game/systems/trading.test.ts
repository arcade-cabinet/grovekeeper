import type { ResourceType } from "@/game/config/resources";
import {
  BASE_TRADE_RATES,
  calculateTradeOutput,
  executeTrade,
  getTradeRates,
} from "./trading";

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
    ): Record<ResourceType, number> => ({
      timber: 0,
      sap: 0,
      fruit: 0,
      acorns: 0,
      ...overrides,
    });

    it("returns spend and gain for a valid trade", () => {
      const result = executeTrade(
        timberToSap,
        10,
        makeResources({ timber: 100 }),
      );
      expect(result).toEqual({
        spend: { type: "timber", amount: 10 },
        gain: { type: "sap", amount: 5 },
      });
    });

    it("returns null if player cannot afford the trade", () => {
      const result = executeTrade(
        timberToSap,
        10,
        makeResources({ timber: 5 }),
      );
      expect(result).toBeNull();
    });

    it("returns null if input amount is less than minimum", () => {
      const result = executeTrade(
        timberToSap,
        5,
        makeResources({ timber: 100 }),
      );
      expect(result).toBeNull();
    });

    it("returns null for zero input", () => {
      const result = executeTrade(
        timberToSap,
        0,
        makeResources({ timber: 100 }),
      );
      expect(result).toBeNull();
    });

    it("floors to whole trade batches", () => {
      const result = executeTrade(
        timberToSap,
        25,
        makeResources({ timber: 100 }),
      );
      expect(result).toEqual({
        spend: { type: "timber", amount: 20 },
        gain: { type: "sap", amount: 10 },
      });
    });

    it("returns null when resources exactly zero", () => {
      const result = executeTrade(
        timberToSap,
        10,
        makeResources({ timber: 0 }),
      );
      expect(result).toBeNull();
    });

    it("works when resources exactly match cost", () => {
      const result = executeTrade(
        timberToSap,
        10,
        makeResources({ timber: 10 }),
      );
      expect(result).not.toBeNull();
      expect(result!.spend.amount).toBe(10);
    });
  });
});
