import { XIcon } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, FONTS, TYPE } from "@/components/ui/tokens";
import { SettingsScreen } from "../SettingsScreen.tsx";
import { ProgressTab } from "./ProgressTab.tsx";
import { SettingsTab } from "./SettingsTab.tsx";
import { StatsTab } from "./StatsTab.tsx";
import type { PauseMenuProps, Tab } from "./types.ts";

export type {
  AchievementDef,
  BorderCosmetic,
  GridExpansionInfo,
  PauseMenuProps,
  PauseMenuStats,
  PrestigeInfo,
} from "./types.ts";

const panelBg = "rgba(10,12,8,0.92)";
const borderColor = DARK.borderBranch;

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
        <View className="flex-1 items-center justify-center bg-black/60 px-4">
          <View
            className="w-full max-w-sm rounded-2xl"
            style={{
              backgroundColor: panelBg,
              borderWidth: 1,
              borderColor,
            }}
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-4 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
            >
              <Text
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 18,
                  fontWeight: "700",
                  color: DARK.textPrimary,
                }}
                testID="pause-menu-title"
              >
                Grove Stats
              </Text>
              <Pressable
                className="min-h-[44px] min-w-[44px] items-center justify-center"
                onPress={handleClose}
                accessibilityLabel="Close menu"
              >
                <Icon as={XIcon} size={20} color={DARK.textSecondary} />
              </Pressable>
            </View>

            {/* Tab bar */}
            <View
              className="flex-row"
              style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
            >
              {(["stats", "progress", "settings"] as Tab[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    className="min-h-[44px] flex-1 items-center justify-center"
                    style={
                      isActive ? { borderBottomWidth: 2, borderBottomColor: ACCENT.sap } : undefined
                    }
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text
                      style={{
                        ...TYPE.label,
                        textTransform: "capitalize",
                        color: isActive ? ACCENT.sap : DARK.textMuted,
                      }}
                    >
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tab content */}
            <ScrollView className="max-h-80 px-4 py-3">
              {activeTab === "stats" && <StatsTab stats={stats} onOpenStats={onOpenStats} />}
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
            <View
              className="gap-2 px-4 py-3"
              style={{ borderTopWidth: 1, borderTopColor: borderColor }}
            >
              <Button
                className="min-h-[44px] w-full rounded-xl"
                style={{ backgroundColor: ACCENT.sap }}
                onPress={handleClose}
              >
                <Text style={{ fontWeight: "700", color: DARK.bgDeep }}>Continue Playing</Text>
              </Button>
              <Button
                className="min-h-[44px] w-full rounded-xl bg-transparent"
                style={{ borderWidth: 2, borderColor: ACCENT.ember }}
                variant="outline"
                onPress={onMainMenu}
              >
                <Text style={{ fontWeight: "700", color: ACCENT.ember }}>Return to Menu</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      <SettingsScreen open={settingsScreenOpen} onClose={() => setSettingsScreenOpen(false)} />
    </>
  );
}
