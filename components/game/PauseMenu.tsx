import { XIcon } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface PauseMenuStats {
  level: number;
  xp: number;
  coins: number;
  treesPlanted: number;
  treesMatured: number;
  gridSize: number;
  unlockedSpeciesCount: number;
  totalSpeciesCount: number;
  unlockedToolsCount: number;
  totalToolsCount: number;
  prestigeCount: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export interface PauseMenuProps {
  open: boolean;
  stats: PauseMenuStats;
  achievements: string[];
  achievementDefs: AchievementDef[];
  soundEnabled: boolean;
  onClose: () => void;
  onMainMenu: () => void;
  onToggleSound: () => void;
}

type Tab = "stats" | "progress" | "settings";

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View className="gap-0.5">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className={`text-xl font-bold ${color ?? "text-forest-green"}`}>
        {value}
      </Text>
    </View>
  );
}

export function PauseMenu({
  open,
  stats,
  achievements,
  achievementDefs,
  soundEnabled,
  onClose,
  onMainMenu,
  onToggleSound,
}: PauseMenuProps) {
  const [activeTab, setActiveTab] = useState<Tab>("stats");

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-2xl border-[3px] border-bark-brown bg-sky-mist">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-bark-brown/20 px-4 py-3">
            <Text className="font-heading text-lg font-bold text-soil-dark">
              Grove Stats
            </Text>
            <Pressable
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              onPress={onClose}
              accessibilityLabel="Close menu"
            >
              <Icon as={XIcon} size={20} className="text-soil-dark" />
            </Pressable>
          </View>

          {/* Tab bar */}
          <View className="flex-row border-b border-bark-brown/20">
            {(["stats", "progress", "settings"] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                className={`min-h-[44px] flex-1 items-center justify-center ${
                  activeTab === tab ? "border-b-2 border-forest-green" : ""
                }`}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  className={`text-xs font-medium capitalize ${
                    activeTab === tab ? "text-forest-green" : "text-gray-500"
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          <ScrollView className="max-h-80 px-4 py-3">
            {activeTab === "stats" && (
              <View className="gap-3">
                <View className="rounded-xl bg-white p-4">
                  <View className="flex-row flex-wrap gap-x-8 gap-y-3">
                    <StatItem label="Level" value={stats.level} />
                    <StatItem label="XP" value={stats.xp} />
                    <StatItem
                      label="Coins"
                      value={stats.coins}
                      color="text-autumn-gold"
                    />
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
                    <StatItem
                      label="Grid Size"
                      value={`${stats.gridSize}x${stats.gridSize}`}
                    />
                  </View>
                </View>

                <View className="gap-1">
                  <Text className="text-sm text-gray-600">
                    Species: {stats.unlockedSpeciesCount}/
                    {stats.totalSpeciesCount}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Tools: {stats.unlockedToolsCount}/{stats.totalToolsCount}
                  </Text>
                  {stats.prestigeCount > 0 && (
                    <Text className="text-sm text-autumn-gold">
                      Prestige: {stats.prestigeCount}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {activeTab === "progress" && (
              <View className="gap-3">
                <View className="rounded-xl bg-white p-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-soil-dark">
                      Achievements
                    </Text>
                    <Text className="text-xs text-autumn-gold">
                      {achievements.length}/{achievementDefs.length}
                    </Text>
                  </View>
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
                </View>
              </View>
            )}

            {activeTab === "settings" && (
              <View className="gap-3">
                {/* Sound toggle */}
                <View className="rounded-xl bg-white p-3">
                  <Pressable
                    className="min-h-[44px] flex-row items-center justify-between"
                    onPress={onToggleSound}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: soundEnabled }}
                    accessibilityLabel="Toggle sound"
                  >
                    <Text className="text-sm text-gray-700">Sound Effects</Text>
                    <View
                      className={`h-8 w-14 items-center rounded-full px-1 ${
                        soundEnabled
                          ? "justify-end bg-forest-green"
                          : "justify-start bg-gray-300"
                      } flex-row`}
                    >
                      <View className="h-6 w-6 rounded-full bg-white shadow" />
                    </View>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View className="gap-2 border-t border-bark-brown/20 px-4 py-3">
            <Button
              className="min-h-[44px] w-full rounded-xl bg-forest-green"
              onPress={onClose}
            >
              <Text className="font-bold text-white">Continue Playing</Text>
            </Button>
            <Button
              className="min-h-[44px] w-full rounded-xl border-2 border-red-400 bg-transparent"
              variant="outline"
              onPress={onMainMenu}
            >
              <Text className="font-bold text-red-500">Return to Menu</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
