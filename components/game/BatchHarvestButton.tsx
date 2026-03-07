/**
 * BatchHarvestButton -- Harvest-all button with ready tree count badge.
 *
 * Shows a gradient pill button when 2+ trees are ready to harvest.
 * Displays a red badge with the ready count in the top-right corner.
 */

import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/text";

export interface BatchHarvestButtonProps {
  readyCount: number;
  onBatchHarvest: () => void;
}

export function BatchHarvestButton({
  readyCount,
  onBatchHarvest,
}: BatchHarvestButtonProps) {
  // Only show when 2+ trees are ready
  if (readyCount < 2) return null;

  return (
    <Pressable
      className="relative min-h-[44px] min-w-[44px]"
      onPress={onBatchHarvest}
      accessibilityLabel={`Harvest all, ${readyCount} trees ready`}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={["#FFB74D", "#8D6E63"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-row items-center rounded-full border-2 border-soil-dark px-4 py-2 shadow-lg"
      >
        <Text className="mr-1 text-sm">{"\uD83E\uDE93"}</Text>
        <Text className="text-sm font-medium text-white">Harvest All</Text>
      </LinearGradient>

      {/* Count badge */}
      <View
        className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: "#8D6E63" }}
      >
        <Text className="text-[10px] font-bold text-white">{readyCount}</Text>
      </View>
    </Pressable>
  );
}
