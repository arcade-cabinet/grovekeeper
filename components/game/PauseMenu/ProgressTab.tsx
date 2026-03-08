import { Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { AchievementDef, BorderCosmetic, GridExpansionInfo, PrestigeInfo } from "./types";

interface ProgressTabProps {
  gridSize: number;
  level: number;
  achievements: string[];
  achievementDefs: AchievementDef[];
  gridExpansion: GridExpansionInfo | null;
  prestige: PrestigeInfo;
  activeBorderCosmetic: string | null;
  unlockedCosmetics: BorderCosmetic[];
  lockedCosmetics: BorderCosmetic[];
  confirmingPrestige: boolean;
  onExpandGrid: () => void;
  onSetBorderCosmetic: (id: string | null) => void;
  onPrestige: () => void;
  onCancelPrestige: () => void;
}

export function ProgressTab({
  gridSize,
  level,
  achievements,
  achievementDefs,
  gridExpansion,
  prestige,
  activeBorderCosmetic,
  unlockedCosmetics,
  lockedCosmetics,
  confirmingPrestige,
  onExpandGrid,
  onSetBorderCosmetic,
  onPrestige,
  onCancelPrestige,
}: ProgressTabProps) {
  return (
    <View className="gap-3">
      {/* Achievements */}
      <View className="rounded-xl bg-white p-3">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-soil-dark">Achievements</Text>
          <Text className="text-xs text-autumn-gold">
            {achievements.length}/{achievementDefs.length}
          </Text>
        </View>
        <ScrollView style={{ maxHeight: 192 }} nestedScrollEnabled>
          <View className="gap-2">
            {achievementDefs.map((achievement) => {
              const isUnlocked = achievements.includes(achievement.id);
              return (
                <View
                  key={achievement.id}
                  className={`flex-row items-start gap-2 rounded-lg border p-2 ${
                    isUnlocked
                      ? "border-prestige-gold/50 bg-prestige-gold/10"
                      : "border-gray-200 bg-black/5"
                  }`}
                >
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full ${
                      isUnlocked ? "bg-prestige-gold" : "bg-gray-400"
                    }`}
                  >
                    <Text className="text-xs text-white">
                      {isUnlocked ? "\u2713" : "?"}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      className={`text-xs font-semibold ${
                        isUnlocked ? "text-soil-dark" : "text-gray-400"
                      }`}
                    >
                      {achievement.name}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-gray-500">
                      {isUnlocked ? achievement.description : "???"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Grid Expansion */}
      <View className="rounded-xl bg-white p-3">
        <Text className="mb-2 text-sm font-bold text-soil-dark">Grid Expansion</Text>
        <Text className="mb-1 text-xs text-gray-500">
          Current: {gridSize}x{gridSize}
        </Text>
        {gridExpansion ? (
          <>
            <Text className="mb-0.5 text-xs text-gray-600">
              Next: {gridExpansion.nextSize}x{gridExpansion.nextSize} (Lv.
              {gridExpansion.nextRequiredLevel})
            </Text>
            <Text className="mb-2 text-xs text-gray-500">
              Cost: {gridExpansion.costLabel}
            </Text>
            <Button
              className={`min-h-[44px] w-full rounded-xl ${
                gridExpansion.canAfford ? "bg-forest-green" : "bg-gray-400"
              }`}
              disabled={!gridExpansion.canAfford}
              onPress={onExpandGrid}
            >
              <Text className="text-xs font-bold text-white">
                Expand to {gridExpansion.nextSize}x{gridExpansion.nextSize}
              </Text>
            </Button>
            {!gridExpansion.meetsLevel && (
              <Text className="mt-1 text-center text-[10px] text-red-400">
                Requires Level {gridExpansion.nextRequiredLevel}
              </Text>
            )}
          </>
        ) : (
          <Text className="text-xs italic text-gray-500">Maximum grid size reached.</Text>
        )}
      </View>

      {/* Border Cosmetics */}
      {unlockedCosmetics.length > 0 && (
        <View className="rounded-xl bg-white p-3">
          <Text className="mb-1 text-sm font-bold text-soil-dark">Border Cosmetics</Text>
          <Text className="mb-2 text-xs text-gray-500">
            Customize your grove border (unlocked by prestige)
          </Text>
          <View className="gap-2">
            {/* Default option */}
            <Pressable
              className={`min-h-[44px] rounded-lg border p-2 ${
                activeBorderCosmetic === null
                  ? "border-forest-green bg-forest-green/10"
                  : "border-gray-200 bg-black/5"
              }`}
              onPress={() => onSetBorderCosmetic(null)}
              accessibilityLabel="Select Default Wood Frame border"
            >
              <Text className="text-xs font-semibold text-soil-dark">
                Default Wood Frame
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500">Classic wooden border</Text>
            </Pressable>

            {/* Unlocked cosmetics */}
            {unlockedCosmetics.map((cosmetic) => (
              <Pressable
                key={cosmetic.id}
                className={`min-h-[44px] rounded-lg border p-2 ${
                  activeBorderCosmetic === cosmetic.id
                    ? "border-forest-green bg-forest-green/10"
                    : "border-gray-200 bg-black/5"
                }`}
                onPress={() => onSetBorderCosmetic(cosmetic.id)}
                accessibilityLabel={`Select ${cosmetic.name} border`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-soil-dark">
                    {cosmetic.name}
                  </Text>
                  {activeBorderCosmetic === cosmetic.id && (
                    <Text className="text-xs text-forest-green">{"\u2713"}</Text>
                  )}
                </View>
                <Text className="mt-0.5 text-xs text-gray-500">
                  {cosmetic.description}
                </Text>
                {/* Color preview swatch */}
                <View
                  className="mt-1 h-4 rounded"
                  style={{
                    borderWidth: 3,
                    borderColor: cosmetic.borderColor,
                    ...(cosmetic.glowColor
                      ? {
                          shadowColor: cosmetic.glowColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      : {}),
                  }}
                />
              </Pressable>
            ))}

            {/* Locked cosmetics */}
            {lockedCosmetics.map((cosmetic) => (
              <View
                key={cosmetic.id}
                className="rounded-lg border border-dashed border-gray-300 p-2 opacity-60"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-gray-400">
                    {cosmetic.name}
                  </Text>
                  <Text className="text-xs text-autumn-gold">
                    Prestige {cosmetic.prestigeRequired}
                  </Text>
                </View>
                <Text className="mt-0.5 text-xs text-gray-400">
                  {cosmetic.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Prestige */}
      <View className="rounded-xl bg-white p-3">
        <Text className="mb-2 text-sm font-bold text-soil-dark">Prestige</Text>
        {prestige.count > 0 && (
          <View className="mb-2 gap-0.5">
            <Text className="text-xs text-gray-600">
              Current prestige: {prestige.count}
            </Text>
            <Text className="text-xs text-gray-600">
              Growth speed: {prestige.growthBonusPct}% bonus
            </Text>
          </View>
        )}
        {prestige.isEligible ? (
          confirmingPrestige ? (
            <View className="gap-2">
              <Text className="text-xs text-gray-700">
                Prestige will reset your level, resources, seeds, and grove to start
                fresh. You keep achievements, lifetime stats, and gain permanent bonuses.
                Are you sure?
              </Text>
              <View className="flex-row gap-2">
                <Button
                  className="min-h-[44px] flex-1 rounded-xl bg-autumn-gold"
                  onPress={onPrestige}
                >
                  <Text className="text-xs font-bold text-white">Confirm Prestige</Text>
                </Button>
                <Button
                  className="min-h-[44px] flex-1 rounded-xl border-2 border-gray-300 bg-transparent"
                  variant="outline"
                  onPress={onCancelPrestige}
                >
                  <Text className="text-xs font-bold text-gray-600">Cancel</Text>
                </Button>
              </View>
            </View>
          ) : (
            <Button
              className="min-h-[44px] w-full rounded-xl bg-autumn-gold"
              onPress={onPrestige}
            >
              <Text className="text-xs font-bold text-white">
                Prestige (Reset for Bonuses)
              </Text>
            </Button>
          )
        ) : (
          <View>
            <Text className="text-xs text-gray-500">
              Reach Level {prestige.minLevel} to unlock Prestige.
            </Text>
            {level > 0 && (
              <Text className="mt-0.5 text-xs text-red-400">
                Current: Lv.{level} / {prestige.minLevel}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
