import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT } from "@/components/ui/tokens";
import { StatItem } from "./StatItem.tsx";
import type { PauseMenuStats } from "./types.ts";

const cardBg = LIGHT.bgCanopy;
const cardBorder = LIGHT.borderBranch;

interface StatsTabProps {
  stats: PauseMenuStats;
  onOpenStats?: () => void;
}

export function StatsTab({ stats, onOpenStats }: StatsTabProps) {
  return (
    <View className="gap-3">
      <View
        className="rounded-xl p-4"
        style={{
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: cardBorder,
        }}
      >
        <View className="flex-row flex-wrap gap-x-8 gap-y-3">
          <StatItem label="Level" value={stats.level} />
          <StatItem label="XP" value={stats.xp} />
          <StatItem label="Coins" value={stats.coins} color={ACCENT.amber} />
          <StatItem label="Trees Planted" value={stats.treesPlanted} color={ACCENT.greenBright} />
          <StatItem label="Trees Matured" value={stats.treesMatured} color={ACCENT.greenBright} />
          <StatItem label="Grid Size" value={`${stats.gridSize}x${stats.gridSize}`} />
        </View>
      </View>

      <View className="gap-1">
        <Text style={{ fontSize: 12, color: LIGHT.textSecondary }}>
          Species: {stats.unlockedSpeciesCount}/{stats.totalSpeciesCount}
        </Text>
        <Text style={{ fontSize: 12, color: LIGHT.textSecondary }}>
          Tools: {stats.unlockedToolsCount}/{stats.totalToolsCount}
        </Text>
        {stats.prestigeCount > 0 && (
          <Text style={{ fontSize: 12, color: ACCENT.amber }}>Prestige: {stats.prestigeCount}</Text>
        )}
        {stats.difficultyName ? (
          <View className="mt-1 flex-row items-center gap-1.5">
            <View
              className="rounded-full px-2 py-0.5"
              style={{
                backgroundColor: stats.difficultyColor ?? "#9E9E9E",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  fontFamily: FONTS.data,
                  color: "#FFF",
                }}
              >
                {stats.difficultyName}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: LIGHT.textMuted }}>difficulty (locked)</Text>
          </View>
        ) : null}
      </View>

      {onOpenStats ? (
        <Button
          className="min-h-[44px] w-full rounded-xl bg-transparent"
          style={{ borderWidth: 2, borderColor: LIGHT.borderBranch }}
          variant="outline"
          onPress={onOpenStats}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: LIGHT.textPrimary }}>
            Full Stats Dashboard
          </Text>
        </Button>
      ) : null}
    </View>
  );
}
