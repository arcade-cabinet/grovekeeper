/**
 * tradeDialogLogic tests (Spec SS15).
 */

import { emptyResources, type ResourceType } from "@/game/config/resources";
import type { TradeRate } from "@/game/systems/trading";
import { computeTradeSummary, formatResourceName, maxTradeQuantity } from "./tradeDialogLogic.ts";

const mockResources: Record<ResourceType, number> = {
  ...emptyResources(),
  timber: 50,
  sap: 20,
  fruit: 10,
  acorns: 5,
};

const rate: TradeRate = { from: "timber", to: "sap", fromAmount: 10, toAmount: 5 };

describe("maxTradeQuantity (Spec SS15)", () => {
  it("returns floor of available / fromAmount", () => {
    expect(maxTradeQuantity(rate, mockResources)).toBe(5);
  });

  it("returns 0 when player has none of the resource", () => {
    const empty = { ...mockResources, timber: 0 };
    expect(maxTradeQuantity(rate, empty)).toBe(0);
  });

  it("returns 0 when fromAmount is 0", () => {
    const zeroRate = { ...rate, fromAmount: 0 };
    expect(maxTradeQuantity(zeroRate, mockResources)).toBe(0);
  });
});

describe("computeTradeSummary (Spec SS15)", () => {
  it("computes cost and gain correctly", () => {
    const summary = computeTradeSummary(rate, 3, mockResources);
    expect(summary.totalCost).toBe(30);
    expect(summary.totalGain).toBe(15);
    expect(summary.canAfford).toBe(true);
    expect(summary.remaining).toBe(20);
  });

  it("returns canAfford false when quantity too high", () => {
    const summary = computeTradeSummary(rate, 10, mockResources);
    expect(summary.canAfford).toBe(false);
    expect(summary.remaining).toBeLessThan(0);
  });
});

describe("formatResourceName (Spec SS15)", () => {
  it("capitalizes first letter", () => {
    expect(formatResourceName("timber")).toBe("Timber");
  });

  it("handles empty string", () => {
    expect(formatResourceName("")).toBe("");
  });

  it("handles single character", () => {
    expect(formatResourceName("a")).toBe("A");
  });
});
