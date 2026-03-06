import { describe, expect, it } from "vitest";
import type { MarketState, TradeRecord } from "./supplyDemand";
import {
  computePriceMultipliers,
  getEffectivePrice,
  initializeMarketState,
  pruneHistory,
  recordTrade,
} from "./supplyDemand";

describe("supplyDemand", () => {
  describe("initializeMarketState", () => {
    it("returns empty history and neutral multipliers", () => {
      const state = initializeMarketState();
      expect(state.tradeHistory).toEqual([]);
      expect(state.priceMultipliers).toEqual({
        timber: 1.0,
        sap: 1.0,
        fruit: 1.0,
        acorns: 1.0,
      });
      expect(state.lastUpdateDay).toBe(0);
    });
  });

  describe("computePriceMultipliers", () => {
    it("returns 1.0 for all resources with no history", () => {
      const result = computePriceMultipliers([], 10);
      expect(result).toEqual({
        timber: 1.0,
        sap: 1.0,
        fruit: 1.0,
        acorns: 1.0,
      });
    });

    it("raises price on buy pressure", () => {
      const history: TradeRecord[] = [
        { resource: "timber", direction: "buy", amount: 50, day: 5 },
      ];
      const result = computePriceMultipliers(history, 10);
      // 1.0 + 50/100 = 1.5
      expect(result.timber).toBe(1.5);
      // Others unaffected
      expect(result.sap).toBe(1.0);
      expect(result.fruit).toBe(1.0);
      expect(result.acorns).toBe(1.0);
    });

    it("lowers price on sell pressure", () => {
      const history: TradeRecord[] = [
        { resource: "sap", direction: "sell", amount: 30, day: 5 },
      ];
      const result = computePriceMultipliers(history, 10);
      // 1.0 + (0 - 30)/100 = 0.7
      expect(result.sap).toBe(0.7);
    });

    it("combines buy and sell pressure", () => {
      const history: TradeRecord[] = [
        { resource: "fruit", direction: "buy", amount: 80, day: 5 },
        { resource: "fruit", direction: "sell", amount: 30, day: 6 },
      ];
      const result = computePriceMultipliers(history, 10);
      // 1.0 + (80 - 30)/100 = 1.5
      expect(result.fruit).toBe(1.5);
    });

    it("clamps multiplier to minimum 0.5", () => {
      const history: TradeRecord[] = [
        { resource: "acorns", direction: "sell", amount: 200, day: 5 },
      ];
      const result = computePriceMultipliers(history, 10);
      // 1.0 + (0 - 200)/100 = -1.0, clamped to 0.5
      expect(result.acorns).toBe(0.5);
    });

    it("clamps multiplier to maximum 2.5", () => {
      const history: TradeRecord[] = [
        { resource: "timber", direction: "buy", amount: 300, day: 5 },
      ];
      const result = computePriceMultipliers(history, 10);
      // 1.0 + 300/100 = 4.0, clamped to 2.5
      expect(result.timber).toBe(2.5);
    });

    it("ignores trades outside the rolling window", () => {
      const history: TradeRecord[] = [
        { resource: "timber", direction: "buy", amount: 100, day: 1 },
        { resource: "timber", direction: "buy", amount: 20, day: 35 },
      ];
      // Window = 30 days from day 40, so cutoff = day 10
      // Only the day-35 trade counts
      const result = computePriceMultipliers(history, 40);
      // 1.0 + 20/100 = 1.2
      expect(result.timber).toBe(1.2);
    });

    it("respects custom window size", () => {
      const history: TradeRecord[] = [
        { resource: "sap", direction: "buy", amount: 50, day: 5 },
      ];
      // Window of 3 days from day 10 -> cutoff = 7
      // Day 5 is outside the 3-day window
      const result = computePriceMultipliers(history, 10, 3);
      expect(result.sap).toBe(1.0);
    });

    it("handles multiple resources independently", () => {
      const history: TradeRecord[] = [
        { resource: "timber", direction: "buy", amount: 50, day: 5 },
        { resource: "sap", direction: "sell", amount: 50, day: 5 },
      ];
      const result = computePriceMultipliers(history, 10);
      expect(result.timber).toBe(1.5);
      expect(result.sap).toBe(0.5);
    });
  });

  describe("recordTrade", () => {
    it("adds a trade record and updates multipliers", () => {
      const state = initializeMarketState();
      const newState = recordTrade(state, "timber", "buy", 50, 5);

      expect(newState.tradeHistory).toHaveLength(1);
      expect(newState.tradeHistory[0]).toEqual({
        resource: "timber",
        direction: "buy",
        amount: 50,
        day: 5,
      });
      expect(newState.priceMultipliers.timber).toBe(1.5);
      expect(newState.lastUpdateDay).toBe(5);
    });

    it("returns same state for zero or negative amount", () => {
      const state = initializeMarketState();
      const result = recordTrade(state, "sap", "sell", 0, 5);
      expect(result).toBe(state);

      const result2 = recordTrade(state, "sap", "sell", -10, 5);
      expect(result2).toBe(state);
    });

    it("accumulates multiple trades", () => {
      let state = initializeMarketState();
      state = recordTrade(state, "timber", "buy", 30, 1);
      state = recordTrade(state, "timber", "buy", 20, 2);

      expect(state.tradeHistory).toHaveLength(2);
      // 1.0 + 50/100 = 1.5
      expect(state.priceMultipliers.timber).toBe(1.5);
    });

    it("does not mutate original state", () => {
      const state = initializeMarketState();
      const newState = recordTrade(state, "fruit", "sell", 25, 3);

      expect(state.tradeHistory).toHaveLength(0);
      expect(newState.tradeHistory).toHaveLength(1);
      expect(state.priceMultipliers.fruit).toBe(1.0);
    });
  });

  describe("getEffectivePrice", () => {
    it("combines base, seasonal, and supply/demand multipliers", () => {
      // 10 * 1.5 * 1.2 = 18
      const price = getEffectivePrice("timber", 10, 1.5, 1.2);
      expect(price).toBe(18);
    });

    it("returns base price when all multipliers are 1.0", () => {
      const price = getEffectivePrice("sap", 25, 1.0, 1.0);
      expect(price).toBe(25);
    });

    it("rounds to one decimal place", () => {
      // 10 * 1.3 * 1.1 = 14.3
      const price = getEffectivePrice("fruit", 10, 1.3, 1.1);
      expect(price).toBe(14.3);
    });

    it("handles discount multipliers", () => {
      // 20 * 0.5 * 0.8 = 8
      const price = getEffectivePrice("acorns", 20, 0.5, 0.8);
      expect(price).toBe(8);
    });

    it("handles zero base price", () => {
      const price = getEffectivePrice("timber", 0, 1.5, 2.0);
      expect(price).toBe(0);
    });
  });

  describe("pruneHistory", () => {
    it("removes records outside the rolling window", () => {
      const state: MarketState = {
        tradeHistory: [
          { resource: "timber", direction: "buy", amount: 10, day: 1 },
          { resource: "sap", direction: "sell", amount: 5, day: 15 },
          { resource: "fruit", direction: "buy", amount: 20, day: 35 },
        ],
        priceMultipliers: { timber: 1.0, sap: 1.0, fruit: 1.0, acorns: 1.0 },
        lastUpdateDay: 35,
      };

      // Day 40, window 30 -> cutoff = 10. Day 1 is out, day 15 and 35 remain.
      const pruned = pruneHistory(state, 40);
      expect(pruned.tradeHistory).toHaveLength(2);
      expect(pruned.tradeHistory[0].day).toBe(15);
      expect(pruned.tradeHistory[1].day).toBe(35);
    });

    it("returns same state if nothing to prune", () => {
      const state: MarketState = {
        tradeHistory: [
          { resource: "timber", direction: "buy", amount: 10, day: 25 },
        ],
        priceMultipliers: { timber: 1.0, sap: 1.0, fruit: 1.0, acorns: 1.0 },
        lastUpdateDay: 25,
      };

      const pruned = pruneHistory(state, 30);
      expect(pruned).toBe(state); // same reference
    });

    it("respects custom window size", () => {
      const state: MarketState = {
        tradeHistory: [
          { resource: "timber", direction: "buy", amount: 10, day: 5 },
          { resource: "sap", direction: "sell", amount: 5, day: 9 },
        ],
        priceMultipliers: { timber: 1.0, sap: 1.0, fruit: 1.0, acorns: 1.0 },
        lastUpdateDay: 9,
      };

      // Day 10, window 3 -> cutoff = 7. Day 5 is out, day 9 remains.
      const pruned = pruneHistory(state, 10, 3);
      expect(pruned.tradeHistory).toHaveLength(1);
      expect(pruned.tradeHistory[0].day).toBe(9);
    });

    it("returns empty history when all records are old", () => {
      const state: MarketState = {
        tradeHistory: [
          { resource: "timber", direction: "buy", amount: 10, day: 1 },
          { resource: "sap", direction: "sell", amount: 5, day: 2 },
        ],
        priceMultipliers: { timber: 1.0, sap: 1.0, fruit: 1.0, acorns: 1.0 },
        lastUpdateDay: 2,
      };

      const pruned = pruneHistory(state, 100);
      expect(pruned.tradeHistory).toHaveLength(0);
    });
  });
});
