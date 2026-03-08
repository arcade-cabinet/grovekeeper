import { XIcon } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SettingsScreen } from "../SettingsScreen.tsx";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ProgressTab } from "./ProgressTab";
import { SettingsTab } from "./SettingsTab";
import { StatsTab } from "./StatsTab";
import type { PauseMenuProps, Tab } from "./types";

export type {
  AchievementDef,
  BorderCosmetic,
  GridExpansionInfo,
  PauseMenuProps,
  PauseMenuStats,
  PrestigeInfo,
} from "./types";

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
              {activeTab === "stats" && (
                <StatsTab stats={stats} onOpenStats={onOpenStats} />
              )}
              {activeTab === "progress" && (
                <ProgressTab
                  gridSize={stats.gridSize}
                  level={stats.level}
                  achievements={achievements}
                  achievementDefs={achievementDefs}
                  gridExpansion={gridExpansion}
                  prestige={prestige}
                  activeBorderCosmetic={activeBorderCosmetic}
                  unlockedCosmetics={unlockedCosmetics}
                  lockedCosmetics={lockedCosmetics}
                  confirmingPrestige={confirmingPrestige}
                  onExpandGrid={onExpandGrid}
                  onSetBorderCosmetic={onSetBorderCosmetic}
                  onPrestige={handlePrestige}
                  onCancelPrestige={() => setConfirmingPrestige(false)}
                />
              )}
              {activeTab === "settings" && (
                <SettingsTab
                  soundEnabled={soundEnabled}
                  hapticsEnabled={hapticsEnabled}
                  onSettings={onSettings}
                  onOpenSettingsScreen={() => setSettingsScreenOpen(true)}
                  onToggleSound={onToggleSound}
                  onToggleHaptics={onToggleHaptics}
                  onExportSave={onExportSave}
                  onImportSave={onImportSave}
                  onHowToPlay={onHowToPlay}
                  onResetGame={onResetGame}
                />
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
