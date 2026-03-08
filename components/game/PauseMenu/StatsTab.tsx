import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { StatItem } from "./StatItem";
import type { PauseMenuStats } from "./types";

interface StatsTabProps {
  stats: PauseMenuStats;
  onOpenStats?: () => void;
}

export function StatsTab({ stats, onOpenStats }: StatsTabProps) {
  return (
    <View className="gap-3">
      <View className="rounded-xl bg-white p-4">
        <View className="flex-row flex-wrap gap-x-8 gap-y-3">
          <StatItem label="Level" value={stats.level} />
          <StatItem label="XP" value={stats.xp} />
          <StatItem label="Coins" value={stats.coins} color="text-autumn-gold" />
          <StatItem
            label="Trees Planted"
            value={stats.treesPlanted}
            color="text-leaf-light"
          />
          <StatItem
            label="Trees Matured"
            value={stats.treesMatured}
            color="text-leaf-light"
          />
          <StatItem label="Grid Size" value={`${stats.gridSize}x${stats.gridSize}`} />
        </View>
      </View>

      <View className="gap-1">
        <Text className="text-sm text-gray-600">
          Species: {stats.unlockedSpeciesCount}/{stats.totalSpeciesCount}
        </Text>
        <Text className="text-sm text-gray-600">
          Tools: {stats.unlockedToolsCount}/{stats.totalToolsCount}
        </Text>
        {stats.prestigeCount > 0 && (
          <Text className="text-sm text-autumn-gold">
            Prestige: {stats.prestigeCount}
          </Text>
        )}
        {stats.difficultyName && (
          <View className="mt-1 flex-row items-center gap-1.5">
            <View
              className="rounded-full px-2 py-0.5"
              style={{
                backgroundColor: stats.difficultyColor ?? "#9E9E9E",
              }}
            >
              <Text className="text-xs font-bold text-white">{stats.difficultyName}</Text>
            </View>
            <Text className="text-xs text-gray-400">difficulty (locked)</Text>
          </View>
        )}
      </View>

      {onOpenStats && (
        <Button
          className="min-h-[44px] w-full rounded-xl border-2 border-bark-brown bg-transparent"
          variant="outline"
          onPress={onOpenStats}
        >
          <Text className="text-sm font-bold text-soil-dark">Full Stats Dashboard</Text>
        </Button>
      )}
    </View>
  );
}
