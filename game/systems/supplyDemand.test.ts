import type { TradeRecord } from "./supplyDemand";
import {
  computePriceMultipliers,
  getEffectivePrice,
  initializeMarketState,
  pruneHistory,
  recordTrade,
} from "./supplyDemand";

describe("supply/demand system", () => {
  describe("initializeMarketState", () => {
    it("creates fresh state with neutral multipliers", () => {
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
      const multipliers = computePriceMultipliers([], 10);
      expect(multipliers).toEqual({
        timber: 1.0,
        sap: 1.0,
        fruit: 1.0,
        acorns: 1.0,
      });
    });

    it("buying raises the price multiplier", () => {
      const history: TradeRecord[] = [{ resource: "timber", direction: "buy", amount: 50, day: 5 }];
      const multipliers = computePriceMultipliers(history, 10);
      expect(multipliers.timber).toBe(1.5); // 1.0 + 50/100
    });

    it("selling lowers the price multiplier", () => {
      const history: TradeRecord[] = [{ resource: "sap", direction: "sell", amount: 50, day: 5 }];
      const multipliers = computePriceMultipliers(history, 10);
      expect(multipliers.sap).toBe(0.5); // 1.0 - 50/100
    });

    it("clamps multiplier to minimum 0.5", () => {
      const history: TradeRecord[] = [
        { resource: "fruit", direction: "sell", amount: 500, day: 5 },
      ];
      const multipliers = computePriceMultipliers(history, 10);
      expect(multipliers.fruit).toBe(0.5);
    });

    it("clamps multiplier to maximum 2.5", () => {
      const history: TradeRecord[] = [
        { resource: "acorns", direction: "buy", amount: 500, day: 5 },
      ];
      const multipliers = computePriceMultipliers(history, 10);
      expect(multipliers.acorns).toBe(2.5);
    });

    it("only considers trades within the rolling window", () => {
      const history: TradeRecord[] = [
        { resource: "timber", direction: "buy", amount: 50, day: 1 }, // outside 30-day window from day 40
        { resource: "timber", direction: "buy", amount: 20, day: 35 },
      ];
      const multipliers = computePriceMultipliers(history, 40, 30);
      expect(multipliers.timber).toBe(1.2); // only day 35 trade counts: 1.0 + 20/100
    });

    it("nets buy and sell volumes", () => {
      const history: TradeRecord[] = [
        { resource: "timber", direction: "buy", amount: 80, day: 5 },
        { resource: "timber", direction: "sell", amount: 30, day: 6 },
      ];
      const multipliers = computePriceMultipliers(history, 10);
      expect(multipliers.timber).toBe(1.5); // 1.0 + (80-30)/100
    });
  });

  describe("recordTrade", () => {
    it("adds a trade record and recomputes multipliers", () => {
      const state = initializeMarketState();
      const newState = recordTrade(state, "timber", "buy", 50, 1);
      expect(newState.tradeHistory).toHaveLength(1);
      expect(newState.priceMultipliers.timber).toBe(1.5);
      expect(newState.lastUpdateDay).toBe(1);
    });

    it("returns same state for zero or negative amount", () => {
      const state = initializeMarketState();
      expect(recordTrade(state, "timber", "buy", 0, 1)).toBe(state);
      expect(recordTrade(state, "timber", "buy", -10, 1)).toBe(state);
    });

    it("is immutable -- does not modify original state", () => {
      const state = initializeMarketState();
      const newState = recordTrade(state, "sap", "sell", 30, 1);
      expect(state.tradeHistory).toHaveLength(0);
      expect(newState.tradeHistory).toHaveLength(1);
    });
  });

  describe("getEffectivePrice", () => {
    it("combines base, seasonal, and supply/demand multipliers", () => {
      // 10 * 1.5 * 2.0 = 30.0
      expect(getEffectivePrice("timber", 10, 1.5, 2.0)).toBe(30);
    });

    it("rounds to one decimal place", () => {
      // 10 * 1.3 * 1.1 = 14.3
      expect(getEffectivePrice("sap", 10, 1.3, 1.1)).toBe(14.3);
    });

    it("returns 0 for zero base price", () => {
      expect(getEffectivePrice("fruit", 0, 1.5, 2.0)).toBe(0);
    });
  });

  describe("pruneHistory", () => {
    it("removes trades outside the rolling window", () => {
      const state = initializeMarketState();
      const withTrades = {
        ...state,
        tradeHistory: [
          {
            resource: "timber" as const,
            direction: "buy" as const,
            amount: 10,
            day: 1,
          },
          {
            resource: "sap" as const,
            direction: "sell" as const,
            amount: 5,
            day: 35,
          },
        ],
      };
      const pruned = pruneHistory(withTrades, 40, 30);
      expect(pruned.tradeHistory).toHaveLength(1);
      expect(pruned.tradeHistory[0].day).toBe(35);
    });

    it("returns same state if nothing to prune", () => {
      const state = initializeMarketState();
      const withTrades = {
        ...state,
        tradeHistory: [
          {
            resource: "timber" as const,
            direction: "buy" as const,
            amount: 10,
            day: 25,
          },
        ],
      };
      const pruned = pruneHistory(withTrades, 30, 30);
      expect(pruned).toBe(withTrades);
    });
  });
});
