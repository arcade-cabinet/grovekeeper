/**
 * TradeDialog -- FPS HUD overlay for trading resources with an NPC.
 *
 * Dark forest RPG aesthetic: semi-transparent dark panel with gold accents.
 * Features:
 *   - NPC greeting with portrait circle
 *   - Trade rate cards with buy/sell price
 *   - Quantity selector (TradeQuantitySelector subcomponent)
 *   - Total cost with afford/can't-afford color coding (green vs red)
 *   - Split view: cost (left) -> gain (right)
 *
 * Renders as an absolute-positioned HUD overlay, not a system Modal.
 */

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, TYPE } from "@/components/ui/tokens";
import type { ResourceType } from "@/game/config/resources";
import type { TradeRate } from "@/game/systems/trading";
import { portraitBgColor, portraitColor } from "./dialogueAnimations.ts";
import { TradeQuantitySelector } from "./TradeQuantitySelector.tsx";
import { computeTradeSummary, formatResourceName, maxTradeQuantity } from "./tradeDialogLogic.ts";

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

  const maxQty = selectedRate ? maxTradeQuantity(selectedRate, resources) : 1;
  const summary = selectedRate ? computeTradeSummary(selectedRate, quantity, resources) : null;

  const handleTrade = () => {
    if (!selectedRate || !summary?.canAfford) return;
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

  const displayName = npcName ?? "Merchant";
  const initial = displayName.charAt(0).toUpperCase();
  const borderCol = portraitColor(displayName);
  const bgCol = portraitBgColor(displayName);

  return (
    <View style={StyleSheet.absoluteFillObject} className="items-center justify-center px-4">
      <Pressable
        style={StyleSheet.absoluteFillObject}
        className="bg-black/40"
        onPress={handleClose}
        accessibilityLabel="Close trade dialog"
      />

      <View
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={{
          backgroundColor: "rgba(15,45,20,0.94)",
          borderWidth: 2,
          borderColor: ACCENT.gold,
          shadowColor: ACCENT.gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 12,
          zIndex: 1,
        }}
      >
        {/* Header with portrait */}
        <View
          className="flex-row items-center justify-between px-4 py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,213,79,0.2)" }}
        >
          <View className="flex-row items-center">
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: borderCol,
                backgroundColor: bgCol,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  fontFamily: FONTS.heading,
                  color: borderCol,
                }}
              >
                {initial}
              </Text>
            </View>
            <View>
              <Text style={{ ...TYPE.heading, fontFamily: FONTS.heading, color: ACCENT.gold }}>
                {displayName}
              </Text>
              <Text style={{ ...TYPE.caption, color: "rgba(232,245,233,0.5)", marginTop: 1 }}>
                Trading Post
              </Text>
            </View>
          </View>
          <Pressable
            className="min-h-[44px] min-w-[44px] items-center justify-center"
            onPress={handleClose}
            accessibilityLabel="Close"
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: ACCENT.gold }}>X</Text>
          </Pressable>
        </View>

        {/* NPC greeting */}
        <View className="px-4 py-2">
          <Text style={{ ...TYPE.caption, fontStyle: "italic", color: "rgba(232,245,233,0.6)" }}>
            "What can I interest you in today?"
          </Text>
        </View>

        {/* Trade rates list */}
        <ScrollView className="px-4 pb-2" style={{ maxHeight: 200 }}>
          <View className="gap-2">
            {rates.map((rate) => {
              const isSelected = selectedRate === rate;
              return (
                <Pressable
                  key={`${rate.from}-${rate.to}`}
                  className="flex-row items-center justify-between rounded-lg px-3 py-3"
                  style={{
                    borderWidth: 1,
                    borderColor: isSelected ? ACCENT.gold : "rgba(255,213,79,0.15)",
                    backgroundColor: isSelected ? "rgba(255,213,79,0.1)" : "rgba(232,245,233,0.04)",
                  }}
                  onPress={() => handleSelectRate(rate)}
                  accessibilityLabel={`Trade ${rate.fromAmount} ${rate.from} for ${rate.toAmount} ${rate.to}`}
                >
                  <Text style={{ ...TYPE.body, fontWeight: "600", color: ACCENT.ember }}>
                    {rate.fromAmount} {formatResourceName(rate.from)}
                  </Text>
                  <Text style={{ fontSize: 16, color: ACCENT.gold, marginHorizontal: 8 }}>
                    {"\u2192"}
                  </Text>
                  <Text style={{ ...TYPE.body, fontWeight: "600", color: ACCENT.sap }}>
                    {rate.toAmount} {formatResourceName(rate.to)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedRate && summary ? (
            <TradeQuantitySelector
              selectedRate={selectedRate}
              summary={summary}
              quantity={quantity}
              maxQty={maxQty}
              onQuantityChange={setQuantity}
              onTrade={handleTrade}
            />
          ) : null}
        </ScrollView>

        {/* Close action */}
        <View
          className="px-4 py-3"
          style={{ borderTopWidth: 1, borderTopColor: "rgba(255,213,79,0.15)" }}
        >
          <Pressable
            className="min-h-[44px] w-full items-center justify-center rounded-xl active:opacity-80"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255,213,79,0.25)",
              backgroundColor: "rgba(255,213,79,0.06)",
            }}
            onPress={handleClose}
          >
            <Text style={{ fontWeight: "700", fontFamily: FONTS.heading, color: ACCENT.gold }}>
              Close
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
