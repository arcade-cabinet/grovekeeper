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
        className="bg-black/50"
        onPress={handleClose}
        accessibilityLabel="Close trade dialog"
      />

      {/* Trade panel */}
      <View
        className="w-full max-w-sm rounded-2xl border-[3px] border-bark-brown bg-parchment"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
          zIndex: 1,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-bark-brown/30 px-4 py-3">
          <Text className="font-heading text-lg font-bold text-soil-dark">
            {npcName ? `Trade with ${npcName}` : "Trading Post"}
          </Text>
          <Pressable
            className="min-h-[44px] min-w-[44px] items-center justify-center"
            onPress={handleClose}
            accessibilityLabel="Close"
          >
            <Text className="text-lg font-bold text-soil-dark">X</Text>
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
                  className={`rounded-lg border p-3 ${
                    isSelected
                      ? "border-forest-green bg-leaf-light/20"
                      : "border-bark-brown/30 bg-white/50"
                  }`}
                  onPress={() => handleSelectRate(rate)}
                  accessibilityLabel={`Trade ${rate.fromAmount} ${rate.from} for ${rate.toAmount} ${rate.to}`}
                >
                  <Text className="text-sm text-soil-dark">
                    <Text className="font-medium capitalize">
                      {rate.fromAmount} {rate.from}
                    </Text>
                    {"  \u2192  "}
                    <Text className="font-medium capitalize">
                      {rate.toAmount} {rate.to}
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Quantity selector + execute */}
          {selectedRate && (
            <View className="mt-4 gap-3">
              {/* Quantity row */}
              <View className="flex-row items-center gap-3">
                <Text className="text-sm text-soil-dark">Qty:</Text>

                {/* Minus button */}
                <Pressable
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-bark-brown/30 bg-white"
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text className="text-lg font-bold text-forest-green">-</Text>
                </Pressable>

                {/* Quantity display */}
                <Text className="min-w-[32px] text-center text-lg font-bold tabular-nums text-forest-green">
                  {quantity}
                </Text>

                {/* Plus button */}
                <Pressable
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-bark-brown/30 bg-white"
                  onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  disabled={quantity >= maxQuantity}
                  accessibilityLabel="Increase quantity"
                >
                  <Text className="text-lg font-bold text-forest-green">+</Text>
                </Pressable>
              </View>

              {/* Trade summary */}
              <Text className="text-xs text-soil-dark">
                Pay: {quantity * selectedRate.fromAmount} {selectedRate.from}
                {"  \u2192  "}
                Get: {quantity * selectedRate.toAmount} {selectedRate.to}
              </Text>

              {/* Trade button */}
              <Button
                className="min-h-[44px] w-full rounded-xl bg-forest-green"
                onPress={handleTrade}
              >
                <Text className="font-bold text-white">Trade</Text>
              </Button>
            </View>
          )}
        </ScrollView>

        {/* Close action */}
        <View className="border-t border-bark-brown/20 px-4 py-3">
          <Button
            className="min-h-[44px] w-full rounded-xl border-2 border-bark-brown bg-transparent"
            variant="outline"
            onPress={handleClose}
          >
            <Text className="font-bold text-bark-brown">Close</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
