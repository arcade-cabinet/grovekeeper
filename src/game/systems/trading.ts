/**
 * Trading system -- resource conversion at settlement zones.
 * Pure functions for trade rate calculations and execution.
 */

import type { ResourceType } from "../constants/resources";

export interface TradeRate {
  from: ResourceType;
  to: ResourceType;
  fromAmount: number;
  toAmount: number;
}

export const BASE_TRADE_RATES: TradeRate[] = [
  { from: "timber", to: "sap", fromAmount: 10, toAmount: 5 },
  { from: "sap", to: "fruit", fromAmount: 10, toAmount: 3 },
  { from: "fruit", to: "acorns", fromAmount: 15, toAmount: 5 },
  { from: "acorns", to: "timber", fromAmount: 20, toAmount: 10 },
];

export function getTradeRates(): TradeRate[] {
  return [...BASE_TRADE_RATES];
}

/**
 * Calculate how much of the output resource you get for a given input amount.
 * Returns 0 if the trade is invalid or the amount is less than the minimum.
 */
export function calculateTradeOutput(rate: TradeRate, inputAmount: number): number {
  if (inputAmount < rate.fromAmount) return 0;
  const trades = Math.floor(inputAmount / rate.fromAmount);
  return trades * rate.toAmount;
}

/**
 * Execute a trade. Returns the amounts to deduct and add, or null if invalid.
 */
export function executeTrade(
  rate: TradeRate,
  inputAmount: number,
  currentResources: Record<ResourceType, number>,
): { spend: { type: ResourceType; amount: number }; gain: { type: ResourceType; amount: number } } | null {
  const trades = Math.floor(inputAmount / rate.fromAmount);
  if (trades <= 0) return null;

  const spendAmount = trades * rate.fromAmount;
  const gainAmount = trades * rate.toAmount;

  if ((currentResources[rate.from] ?? 0) < spendAmount) return null;

  return {
    spend: { type: rate.from, amount: spendAmount },
    gain: { type: rate.to, amount: gainAmount },
  };
}
