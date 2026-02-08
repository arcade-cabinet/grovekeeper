import { describe, expect, it } from "vitest";
import type { ResourceType } from "../constants/resources";
import type { TradeRate } from "./trading";
import { calculateTradeOutput, executeTrade, getTradeRates } from "./trading";

describe("trading", () => {
  const makeResources = (
    overrides: Partial<Record<ResourceType, number>> = {},
  ): Record<ResourceType, number> => ({
    timber: 0,
    sap: 0,
    fruit: 0,
    acorns: 0,
    ...overrides,
  });

  describe("getTradeRates", () => {
    it("returns 4 trade rates", () => {
      const rates = getTradeRates();
      expect(rates).toHaveLength(4);
    });

    it("returns a copy (not the original array)", () => {
      const a = getTradeRates();
      const b = getTradeRates();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe("calculateTradeOutput", () => {
    const timberToSap: TradeRate = {
      from: "timber",
      to: "sap",
      fromAmount: 10,
      toAmount: 5,
    };

    it("returns 0 for insufficient amount", () => {
      expect(calculateTradeOutput(timberToSap, 5)).toBe(0);
      expect(calculateTradeOutput(timberToSap, 0)).toBe(0);
    });

    it("calculates correct output for 1x trade", () => {
      expect(calculateTradeOutput(timberToSap, 10)).toBe(5);
    });

    it("handles multiple trade batches", () => {
      expect(calculateTradeOutput(timberToSap, 30)).toBe(15);
    });

    it("floors to whole batches (ignores remainder)", () => {
      expect(calculateTradeOutput(timberToSap, 15)).toBe(5);
      expect(calculateTradeOutput(timberToSap, 29)).toBe(10);
    });
  });

  describe("executeTrade", () => {
    const timberToSap: TradeRate = {
      from: "timber",
      to: "sap",
      fromAmount: 10,
      toAmount: 5,
    };
    const fruitToAcorns: TradeRate = {
      from: "fruit",
      to: "acorns",
      fromAmount: 15,
      toAmount: 5,
    };

    it("returns null for insufficient resources", () => {
      const resources = makeResources({ timber: 5 });
      const result = executeTrade(timberToSap, 10, resources);
      expect(result).toBeNull();
    });

    it("returns null when input amount is less than minimum", () => {
      const resources = makeResources({ timber: 100 });
      const result = executeTrade(timberToSap, 5, resources);
      expect(result).toBeNull();
    });

    it("returns correct spend/gain for valid trade", () => {
      const resources = makeResources({ timber: 50 });
      const result = executeTrade(timberToSap, 20, resources);
      expect(result).not.toBeNull();
      expect(result!.spend).toEqual({ type: "timber", amount: 20 });
      expect(result!.gain).toEqual({ type: "sap", amount: 10 });
    });

    it("floors to whole trade batches", () => {
      const resources = makeResources({ fruit: 100 });
      const result = executeTrade(fruitToAcorns, 25, resources);
      expect(result).not.toBeNull();
      // 25 / 15 = 1 batch (floored), spend 15, gain 5
      expect(result!.spend).toEqual({ type: "fruit", amount: 15 });
      expect(result!.gain).toEqual({ type: "acorns", amount: 5 });
    });

    it("handles exact multiple of fromAmount", () => {
      const resources = makeResources({ timber: 30 });
      const result = executeTrade(timberToSap, 30, resources);
      expect(result).not.toBeNull();
      expect(result!.spend).toEqual({ type: "timber", amount: 30 });
      expect(result!.gain).toEqual({ type: "sap", amount: 15 });
    });

    it("returns null when zero input amount", () => {
      const resources = makeResources({ timber: 100 });
      const result = executeTrade(timberToSap, 0, resources);
      expect(result).toBeNull();
    });
  });
});
