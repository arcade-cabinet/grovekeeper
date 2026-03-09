/**
 * TradeDialog -- FPS HUD overlay for trading resources with an NPC.
 *
 * Shows available trade rates (supply/demand adjusted by caller), lets the
 * player select one, adjust quantity with +/- buttons, and execute the trade.
 * Renders as an absolute-positioned HUD overlay, not a system Modal.
 */

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import type { ResourceType } from "@/game/config/resources";
import type { TradeRate } from "@/game/systems/trading";

export interface TradeDialogProps {
  open: boolean;
  resources: Record<ResourceType, number>;
  rates: TradeRate[];
  onExecuteTrade: (rate: TradeRate, quantity: number) => void;
  onClose: () => void;
  /** NPC name shown in the dialog header. */
  npcName?: string;
}

export function TradeDialog({
  open,
  resources,
  rates,
  onExecuteTrade,
  onClose,
  npcName,
}: TradeDialogProps) {
  const [selectedRate, setSelectedRate] = useState<TradeRate | null>(null);
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = selectedRate
    ? Math.max(1, Math.floor((resources[selectedRate.from] ?? 0) / selectedRate.fromAmount))
    : 1;

  const handleTrade = () => {
    if (!selectedRate) return;
    onExecuteTrade(selectedRate, quantity);
  };

  const handleSelectRate = (rate: TradeRate) => {
    setSelectedRate(rate);
    setQuantity(1);
  };

  const handleClose = () => {
    setSelectedRate(null);
    setQuantity(1);
    onClose();
  };

  if (!open) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} className="items-center justify-center px-4">
      {/* Backdrop — tap to close */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        className="bg-black/20"
        onPress={handleClose}
        accessibilityLabel="Close trade dialog"
      />

      {/* Trade panel */}
      <View
        className="w-full max-w-sm rounded-2xl"
        style={{
          backgroundColor: "rgba(255,255,255,0.92)",
          borderWidth: 1,
          borderColor: LIGHT.borderBranch,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
          zIndex: 1,
        }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: LIGHT.borderBranch }}
        >
          <Text
            style={{
              ...TYPE.heading,
              fontFamily: FONTS.heading,
              color: LIGHT.textPrimary,
            }}
          >
            {npcName ? `Trade with ${npcName}` : "Trading Post"}
          </Text>
          <Pressable
            className="min-h-[44px] min-w-[44px] items-center justify-center"
            onPress={handleClose}
            accessibilityLabel="Close"
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: LIGHT.textSecondary }}>X</Text>
          </Pressable>
        </View>

        {/* Trade rates list */}
        <ScrollView className="px-4 py-3">
          <View className="gap-2">
            {rates.map((rate) => {
              const isSelected = selectedRate === rate;
              return (
                <Pressable
                  key={`${rate.from}-${rate.to}`}
                  className="rounded-lg p-3"
                  style={{
                    borderWidth: 1,
                    borderColor: isSelected ? ACCENT.sap : LIGHT.borderBranch,
                    backgroundColor: isSelected ? "rgba(76,175,80,0.12)" : "rgba(232,245,233,0.5)",
                  }}
                  onPress={() => handleSelectRate(rate)}
                  accessibilityLabel={`Trade ${rate.fromAmount} ${rate.from} for ${rate.toAmount} ${rate.to}`}
                >
                  <Text style={{ ...TYPE.body, color: LIGHT.textPrimary }}>
                    <Text style={{ fontWeight: "500", textTransform: "capitalize" }}>
                      {rate.fromAmount} {rate.from}
                    </Text>
                    {"  \u2192  "}
                    <Text style={{ fontWeight: "500", textTransform: "capitalize" }}>
                      {rate.toAmount} {rate.to}
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Quantity selector + execute */}
          {selectedRate ? (
            <View className="mt-4 gap-3">
              {/* Quantity row */}
              <View className="flex-row items-center gap-3">
                <Text style={{ ...TYPE.body, color: LIGHT.textSecondary }}>Qty:</Text>

                {/* Minus button */}
                <Pressable
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
                  style={{
                    borderWidth: 1,
                    borderColor: LIGHT.borderBranch,
                    backgroundColor: "rgba(232,245,233,0.6)",
                  }}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={{ fontSize: 18, fontWeight: "700", color: ACCENT.sap }}>-</Text>
                </Pressable>

                {/* Quantity display */}
                <Text
                  style={{
                    minWidth: 32,
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: "700",
                    color: ACCENT.sap,
                  }}
                >
                  {quantity}
                </Text>

                {/* Plus button */}
                <Pressable
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
                  style={{
                    borderWidth: 1,
                    borderColor: LIGHT.borderBranch,
                    backgroundColor: "rgba(232,245,233,0.6)",
                  }}
                  onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  disabled={quantity >= maxQuantity}
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={{ fontSize: 18, fontWeight: "700", color: ACCENT.sap }}>+</Text>
                </Pressable>
              </View>

              {/* Trade summary */}
              <Text style={{ ...TYPE.caption, color: LIGHT.textSecondary }}>
                Pay: {quantity * selectedRate.fromAmount} {selectedRate.from}
                {"  \u2192  "}
                Get: {quantity * selectedRate.toAmount} {selectedRate.to}
              </Text>

              {/* Trade button */}
              <Button
                className="min-h-[44px] w-full rounded-xl"
                style={{ backgroundColor: ACCENT.sap }}
                onPress={handleTrade}
              >
                <Text style={{ fontWeight: "700", color: LIGHT.textPrimary }}>Trade</Text>
              </Button>
            </View>
          ) : null}
        </ScrollView>

        {/* Close action */}
        <View
          className="px-4 py-3"
          style={{ borderTopWidth: 1, borderTopColor: LIGHT.borderBranch }}
        >
          <Button
            className="min-h-[44px] w-full rounded-xl bg-transparent"
            style={{ borderWidth: 2, borderColor: LIGHT.borderBranch }}
            variant="outline"
            onPress={handleClose}
          >
            <Text style={{ fontWeight: "700", color: LIGHT.textSecondary }}>Close</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
