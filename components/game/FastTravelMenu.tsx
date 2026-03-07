/**
 * FastTravelMenu -- UI for selecting a campfire fast travel destination.
 *
 * Spec §17.6 (Map & Navigation): campfire network, max 8 points.
 *
 * Props:
 *   open           -- controlled visibility
 *   onTeleport     -- called with world {x, z} of selected campfire
 *   onClose        -- close handler
 */

import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useGameStore } from "@/game/stores/gameStore";
import { getTeleportTarget } from "@/game/systems/fastTravel";

export interface FastTravelMenuProps {
  open: boolean;
  onTeleport: (position: { x: number; z: number }) => void;
  onClose: () => void;
}

export function FastTravelMenu({ open, onTeleport, onClose }: FastTravelMenuProps) {
  const discoveredCampfires = useGameStore((s) => s.discoveredCampfires);

  const handleSelect = (id: string) => {
    const target = getTeleportTarget(discoveredCampfires, id);
    if (!target) return;
    onTeleport(target);
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        {/* Backdrop tap to close */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Close fast travel menu"
        />

        {/* Menu panel */}
        <View className="mx-3 mb-6 rounded-2xl border-2 border-bark-brown bg-parchment shadow-lg">
          {/* Header */}
          <View className="flex-row items-center border-b border-bark-brown/30 px-4 py-3">
            <Text className="font-heading text-lg font-bold text-soil-dark">
              Fast Travel
            </Text>
            <Text className="ml-2 text-sm text-soil-dark/60">
              ({discoveredCampfires.length}/8 campfires)
            </Text>
            <Pressable
              className="ml-auto min-h-[44px] min-w-[44px] items-center justify-center"
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Text className="text-xl text-soil-dark/60">×</Text>
            </Pressable>
          </View>

          {/* Campfire list */}
          <ScrollView style={{ maxHeight: 320 }} className="px-4 py-2">
            {discoveredCampfires.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-sm text-soil-dark/50 text-center">
                  No campfires discovered yet.{"\n"}Visit a campfire to add it to your network.
                </Text>
              </View>
            ) : (
              discoveredCampfires.map((point) => (
                <Pressable
                  key={point.id}
                  className="mb-2 min-h-[52px] flex-row items-center justify-between rounded-xl border-2 border-forest-green/40 bg-forest-green/10 px-4 py-3 active:opacity-70"
                  onPress={() => handleSelect(point.id)}
                  accessibilityLabel={`Travel to ${point.label}`}
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xl">🔥</Text>
                    <View>
                      <Text className="font-medium text-soil-dark">{point.label}</Text>
                      <Text className="text-xs text-soil-dark/50">
                        {point.worldX.toFixed(0)}, {point.worldZ.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-medium text-forest-green">Travel →</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
