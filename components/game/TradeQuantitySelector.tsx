/**
 * TradeQuantitySelector -- Quantity controls + summary for TradeDialog.
 *
 * Extracted from TradeDialog.tsx to keep both files under 300 lines.
 */

import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, TYPE } from "@/components/ui/tokens";
import type { TradeRate } from "@/game/systems/trading";
import type { TradeSummary } from "./tradeDialogLogic.ts";
import { formatResourceName } from "./tradeDialogLogic.ts";

export interface TradeQuantitySelectorProps {
  selectedRate: TradeRate;
  summary: TradeSummary;
  quantity: number;
  maxQty: number;
  onQuantityChange: (qty: number) => void;
  onTrade: () => void;
}

export function TradeQuantitySelector({
  selectedRate,
  summary,
  quantity,
  maxQty,
  onQuantityChange,
  onTrade,
}: TradeQuantitySelectorProps) {
  return (
    <View className="mt-3 gap-3">
      {/* Quantity row */}
      <View className="flex-row items-center justify-center gap-3">
        {/* Minus button */}
        <Pressable
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
          style={{
            borderWidth: 1,
            borderColor: "rgba(255,213,79,0.2)",
            backgroundColor: "rgba(255,213,79,0.06)",
          }}
          onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
          disabled={quantity <= 1}
          accessibilityLabel="Decrease quantity"
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              fontFamily: FONTS.data,
              color: quantity <= 1 ? "rgba(232,245,233,0.3)" : ACCENT.gold,
            }}
          >
            -
          </Text>
        </Pressable>

        {/* Quantity display */}
        <Text
          style={{
            minWidth: 40,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "700",
            fontFamily: FONTS.data,
            color: ACCENT.gold,
          }}
        >
          {quantity}
        </Text>

        {/* Plus button */}
        <Pressable
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
          style={{
            borderWidth: 1,
            borderColor: "rgba(255,213,79,0.2)",
            backgroundColor: "rgba(255,213,79,0.06)",
          }}
          onPress={() => onQuantityChange(Math.min(maxQty, quantity + 1))}
          disabled={quantity >= maxQty}
          accessibilityLabel="Increase quantity"
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              fontFamily: FONTS.data,
              color: quantity >= maxQty ? "rgba(232,245,233,0.3)" : ACCENT.gold,
            }}
          >
            +
          </Text>
        </Pressable>
      </View>

      {/* Trade summary with afford coloring */}
      <View
        className="flex-row items-center justify-between rounded-lg px-3 py-2"
        style={{
          backgroundColor: "rgba(232,245,233,0.04)",
          borderWidth: 1,
          borderColor: summary.canAfford ? "rgba(76,175,80,0.3)" : "rgba(239,83,80,0.3)",
        }}
      >
        <Text
          style={{
            ...TYPE.body,
            fontWeight: "600",
            fontFamily: FONTS.data,
            color: ACCENT.ember,
          }}
        >
          -{summary.totalCost} {formatResourceName(selectedRate.from)}
        </Text>
        <Text style={{ color: ACCENT.gold, fontSize: 14 }}>{"\u2192"}</Text>
        <Text
          style={{
            ...TYPE.body,
            fontWeight: "600",
            fontFamily: FONTS.data,
            color: ACCENT.sap,
          }}
        >
          +{summary.totalGain} {formatResourceName(selectedRate.to)}
        </Text>
      </View>

      {/* Can't afford warning */}
      {!summary.canAfford ? (
        <Text
          style={{
            ...TYPE.caption,
            color: ACCENT.ember,
            textAlign: "center",
          }}
        >
          Not enough {formatResourceName(selectedRate.from)}
        </Text>
      ) : null}

      {/* Trade button */}
      <Pressable
        className="min-h-[44px] w-full items-center justify-center rounded-xl active:opacity-80"
        style={{
          backgroundColor: summary.canAfford ? ACCENT.sap : "rgba(158,158,158,0.3)",
          shadowColor: summary.canAfford ? ACCENT.sap : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        }}
        onPress={onTrade}
        disabled={!summary.canAfford}
      >
        <Text
          style={{
            fontWeight: "700",
            fontFamily: FONTS.heading,
            fontSize: 15,
            color: summary.canAfford ? "#fff" : "rgba(232,245,233,0.4)",
          }}
        >
          Trade
        </Text>
      </Pressable>
    </View>
  );
}
