/**
 * PauseMenu -- Tabbed overlay with slide-in animation and crossfade tabs.
 *
 * Semi-transparent panel slides in from the right over the frozen game world.
 * Tabs: Stats | Progress | Settings with crossfade transitions.
 * Decorative leaf/vine border frame via corner accents.
 */

import { XIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ACCENT } from "@/components/ui/tokens";
import {
  createBackdropAnim,
  createFadeAnim,
  createSlideAnim,
  crossfadeTab,
  fadeBackdropIn,
  fadeBackdropOut,
  slideIn,
  slideOut,
} from "../pauseMenuAnimations.ts";
import { pauseStyles as s } from "../pauseMenuStyles.ts";
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

const TAB_LIST: { key: Tab; label: string; icon: string }[] = [
  { key: "stats", label: "Stats", icon: "\uD83D\uDCCA" },
  { key: "progress", label: "Progress", icon: "\uD83C\uDFC6" },
  { key: "settings", label: "Settings", icon: "\u2699\uFE0F" },
];

const CORNER = "\u2767";

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

  const slideAnim = useRef(createSlideAnim()).current;
  const fadeAnim = useRef(createFadeAnim()).current;
  const backdropAnim = useRef(createBackdropAnim()).current;

  useEffect(() => {
    if (open) {
      slideIn(slideAnim);
      fadeBackdropIn(backdropAnim);
    }
  }, [open, slideAnim, backdropAnim]);

  const handleClose = useCallback(() => {
    setConfirmingPrestige(false);
    fadeBackdropOut(backdropAnim, 200);
    slideOut(slideAnim, 250, () => onClose());
  }, [onClose, slideAnim, backdropAnim]);

  const handleTabSwitch = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return;
      crossfadeTab(fadeAnim, () => setActiveTab(tab));
    },
    [activeTab, fadeAnim],
  );

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
      <Modal visible={open} transparent animationType="none" onRequestClose={handleClose}>
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
          <Animated.View style={[s.panelOuter, { transform: [{ translateX: slideAnim }] }]}>
            {/* Decorative corners */}
            <View style={s.cornerTL}>
              <Text style={s.cornerText}>{CORNER}</Text>
            </View>
            <View style={s.cornerTR}>
              <Text style={[s.cornerText, s.cornerFlipped]}>{CORNER}</Text>
            </View>
            <View style={s.cornerBL}>
              <Text style={[s.cornerText, s.cornerRotated]}>{CORNER}</Text>
            </View>
            <View style={s.cornerBR}>
              <Text style={[s.cornerText, s.cornerRotatedFlipped]}>{CORNER}</Text>
            </View>

            <View style={s.panel}>
              {/* Header */}
              <View style={s.header}>
                <Text style={s.headerTitle} testID="pause-menu-title">
                  Grove Stats
                </Text>
                <Pressable
                  style={s.closeButton}
                  onPress={handleClose}
                  accessibilityLabel="Close menu"
                >
                  <Icon as={XIcon} size={20} color="#78909C" />
                </Pressable>
              </View>

              {/* Tab bar */}
              <View style={s.tabBar}>
                {TAB_LIST.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      style={[s.tab, isActive && s.tabActive]}
                      onPress={() => handleTabSwitch(tab.key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={s.tabIcon}>{tab.icon}</Text>
                      <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Tab content */}
              <Animated.View style={[s.tabContentWrap, { opacity: fadeAnim }]}>
                <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
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
              </Animated.View>

              {/* Footer */}
              <View style={s.footer}>
                <Button
                  className="min-h-[44px] w-full rounded-xl"
                  style={{ backgroundColor: ACCENT.greenBright }}
                  onPress={handleClose}
                >
                  <Text style={s.continueText}>Continue Playing</Text>
                </Button>
                <Button
                  className="min-h-[44px] w-full rounded-xl bg-transparent"
                  style={{ borderWidth: 2, borderColor: ACCENT.ember }}
                  variant="outline"
                  onPress={onMainMenu}
                >
                  <Text style={s.menuText}>Return to Menu</Text>
                </Button>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
      <SettingsScreen open={settingsScreenOpen} onClose={() => setSettingsScreenOpen(false)} />
    </>
  );
}
