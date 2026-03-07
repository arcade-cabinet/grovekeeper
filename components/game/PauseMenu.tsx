/**
 * PauseMenu -- Full-featured pause overlay with tabbed interface.
 *
 * Restores all features from the original BabylonJS web version:
 * - Stats tab: level, XP, coins, trees, grid, species/tools count, difficulty,
 *   full stats dashboard link
 * - Progress tab: achievements list, grid expansion (cost + level req),
 *   border cosmetics (5 prestige swatches), prestige 2-step confirm
 * - Settings tab: sound toggle, haptics toggle, save management
 *   (export/import), How to Play button
 * - Action buttons: Continue Playing, Return to Menu
 */

import { BookOpenIcon, DownloadIcon, SettingsIcon, UploadIcon, XIcon } from "lucide-react-native";
import { useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, Share, View } from "react-native";
import { SettingsScreen } from "./SettingsScreen.tsx";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  difficultyName?: string;
  difficultyColor?: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export interface GridExpansionInfo {
  nextSize: number;
  nextRequiredLevel: number;
  costLabel: string;
  canAfford: boolean;
  meetsLevel: boolean;
}

export interface BorderCosmetic {
  id: string;
  name: string;
  description: string;
  prestigeRequired: number;
  borderColor: string;
  borderStyle: string;
  glowColor?: string;
}

export interface PrestigeInfo {
  count: number;
  growthBonusPct: number;
  isEligible: boolean;
  minLevel: number;
}

export interface PauseMenuProps {
  open: boolean;
  stats: PauseMenuStats;
  achievements: string[];
  achievementDefs: AchievementDef[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  // Grid expansion
  gridExpansion: GridExpansionInfo | null;
  // Prestige
  prestige: PrestigeInfo;
  // Border cosmetics
  activeBorderCosmetic: string | null;
  unlockedCosmetics: BorderCosmetic[];
  lockedCosmetics: BorderCosmetic[];
  // Callbacks
  onClose: () => void;
  onMainMenu: () => void;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onExpandGrid: () => void;
  onPrestige: () => void;
  onResetGame: () => void;
  onSetBorderCosmetic: (id: string | null) => void;
  onHowToPlay?: () => void;
  onOpenStats?: () => void;
  onExportSave?: () => void;
  onImportSave?: () => void;
  /** Open the full Audio/Graphics/Controls settings screen. */
  onSettings?: () => void;
}

type Tab = "stats" | "progress" | "settings";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
      <Text className={`text-xl font-bold ${color ?? "text-forest-green"}`}>{value}</Text>
    </View>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable
      className="min-h-[44px] flex-row items-center justify-between"
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={label}
    >
      <Text className="text-sm text-gray-700">{label}</Text>
      <View
        className={`h-8 w-14 items-center rounded-full px-1 ${
          enabled ? "justify-end bg-forest-green" : "justify-start bg-gray-300"
        } flex-row`}
      >
        <View className="h-6 w-6 rounded-full bg-white shadow" />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PauseMenu({
  open,
  stats,
  achievements,
  achievementDefs,
  soundEnabled,
  hapticsEnabled,
  gridExpansion,
  prestige,
  activeBorderCosmetic,
  unlockedCosmetics,
  lockedCosmetics,
  onClose,
  onMainMenu,
  onToggleSound,
  onToggleHaptics,
  onExpandGrid,
  onPrestige,
  onResetGame,
  onSetBorderCosmetic,
  onHowToPlay,
  onOpenStats,
  onExportSave,
  onImportSave,
  onSettings,
}: PauseMenuProps) {
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [confirmingPrestige, setConfirmingPrestige] = useState(false);
  const [settingsScreenOpen, setSettingsScreenOpen] = useState(false);

  // Reset prestige confirm when dialog closes
  const handleClose = () => {
    setConfirmingPrestige(false);
    onClose();
  };

  const handlePrestige = () => {
    if (!confirmingPrestige) {
      setConfirmingPrestige(true);
      return;
    }
    onPrestige();
    setConfirmingPrestige(false);
  };

  const handleCancelPrestige = () => {
    setConfirmingPrestige(false);
  };

  return (
    <>
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-2xl border-[3px] border-bark-brown bg-sky-mist">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-bark-brown/20 px-4 py-3">
            <Text className="font-heading text-lg font-bold text-soil-dark">Grove Stats</Text>
            <Pressable
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              onPress={handleClose}
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
            {/* ── Stats tab ── */}
            {activeTab === "stats" && (
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

                {/* Full Stats Dashboard button */}
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
            )}

            {/* ── Progress tab ── */}
            {activeTab === "progress" && (
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
                    Current: {stats.gridSize}x{stats.gridSize}
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
                                    shadowOffset: {
                                      width: 0,
                                      height: 0,
                                    },
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
                            onPress={handlePrestige}
                          >
                            <Text className="text-xs font-bold text-white">Confirm Prestige</Text>
                          </Button>
                          <Button
                            className="min-h-[44px] flex-1 rounded-xl border-2 border-gray-300 bg-transparent"
                            variant="outline"
                            onPress={handleCancelPrestige}
                          >
                            <Text className="text-xs font-bold text-gray-600">Cancel</Text>
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <Button
                        className="min-h-[44px] w-full rounded-xl bg-autumn-gold"
                        onPress={handlePrestige}
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
                      {stats.level > 0 && (
                        <Text className="mt-0.5 text-xs text-red-400">
                          Current: Lv.{stats.level} / {prestige.minLevel}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ── Settings tab ── */}
            {activeTab === "settings" && (
              <View className="gap-3">
                {/* Audio / Graphics / Controls */}
                <Button
                  className="min-h-[48px] w-full rounded-xl bg-forest-green"
                  onPress={() => {
                    if (onSettings) {
                      onSettings();
                    } else {
                      setSettingsScreenOpen(true);
                    }
                  }}
                >
                  <Icon as={SettingsIcon} size={16} className="text-white" />
                  <Text className="ml-1 font-bold text-white">Audio, Graphics & Controls</Text>
                </Button>

                {/* Sound toggle */}
                <View className="rounded-xl bg-white p-3">
                  <ToggleSwitch
                    enabled={soundEnabled}
                    onToggle={onToggleSound}
                    label="Sound Effects"
                  />
                </View>

                {/* Haptics toggle */}
                <View className="rounded-xl bg-white p-3">
                  <ToggleSwitch
                    enabled={hapticsEnabled}
                    onToggle={onToggleHaptics}
                    label="Haptic Feedback"
                  />
                </View>

                {/* Save management */}
                {(onExportSave || onImportSave) && (
                  <View className="rounded-xl bg-white p-3">
                    <Text className="mb-2 text-sm font-bold text-soil-dark">Save Management</Text>
                    <View className="flex-row gap-2">
                      {onExportSave && (
                        <Button
                          className="min-h-[44px] flex-1 rounded-xl border-2 border-bark-brown bg-transparent"
                          variant="outline"
                          onPress={onExportSave}
                        >
                          <Icon as={DownloadIcon} size={14} className="text-soil-dark" />
                          <Text className="ml-1 text-xs font-bold text-soil-dark">Export</Text>
                        </Button>
                      )}
                      {onImportSave && (
                        <Button
                          className="min-h-[44px] flex-1 rounded-xl border-2 border-bark-brown bg-transparent"
                          variant="outline"
                          onPress={onImportSave}
                        >
                          <Icon as={UploadIcon} size={14} className="text-soil-dark" />
                          <Text className="ml-1 text-xs font-bold text-soil-dark">Import</Text>
                        </Button>
                      )}
                    </View>
                  </View>
                )}

                {/* How to Play */}
                {onHowToPlay && (
                  <Button
                    className="min-h-[44px] w-full rounded-xl border-2 border-forest-green bg-transparent"
                    variant="outline"
                    onPress={onHowToPlay}
                  >
                    <Icon as={BookOpenIcon} size={16} className="text-forest-green" />
                    <Text className="ml-1 font-bold text-forest-green">How to Play</Text>
                  </Button>
                )}

                {/* Reset game */}
                <Button
                  className="min-h-[44px] w-full rounded-xl border-2 border-red-400 bg-transparent"
                  variant="outline"
                  onPress={() => {
                    Alert.alert(
                      "Reset All Data",
                      "This will permanently delete all your progress. This cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Reset",
                          style: "destructive",
                          onPress: onResetGame,
                        },
                      ],
                    );
                  }}
                >
                  <Text className="font-bold text-red-500">Reset All Data</Text>
                </Button>
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View className="gap-2 border-t border-bark-brown/20 px-4 py-3">
            <Button
              className="min-h-[44px] w-full rounded-xl bg-forest-green"
              onPress={handleClose}
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
    <SettingsScreen open={settingsScreenOpen} onClose={() => setSettingsScreenOpen(false)} />
    </>
  );
}
