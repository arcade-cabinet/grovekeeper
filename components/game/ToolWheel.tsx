/**
 * ToolWheel -- Tool selector dialog with icon grid and tool unlock previews.
 *
 * Displays all game tools in a 3-column grid. Unlocked tools are selectable,
 * locked tools show their unlock level. If the player meets the level
 * requirement, tapping an unowned tool auto-unlocks it.
 */

import type { LucideIcon } from "lucide-react-native";
import {
  AxeIcon,
  BookOpenIcon,
  CloudRainIcon,
  DropletsIcon,
  GitMergeIcon,
  RecycleIcon,
  ScissorsIcon,
  ShieldIcon,
  ShovelIcon,
  SparklesIcon,
  SproutIcon,
  WrenchIcon,
} from "lucide-react-native";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ACCENT, HUD_PANEL, LIGHT, TYPE } from "@/components/ui/tokens";
import type { ToolData } from "@/game/config/tools";
import { TOOLS } from "@/game/config/tools";
import { useToolWheelTabKey } from "./toolWheelLogic.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ToolWheelProps {
  open: boolean;
  /** Called to open the wheel. Used internally for Tab key / long-press wiring. */
  onOpen?: () => void;
  onClose: () => void;
  unlockedTools: string[];
  selectedTool: string;
  level: number;
  onSelectTool: (toolId: string) => void;
  onUnlockTool: (toolId: string) => void;
}

// ---------------------------------------------------------------------------
// Icon mapping (mirrors ToolBelt but with extra tools)
// ---------------------------------------------------------------------------

const TOOL_ICONS: Record<string, LucideIcon> = {
  trowel: ShovelIcon,
  "watering-can": DropletsIcon,
  almanac: BookOpenIcon,
  "pruning-shears": ScissorsIcon,
  "seed-pouch": SproutIcon,
  shovel: WrenchIcon,
  axe: AxeIcon,
  "compost-bin": RecycleIcon,
  "rain-catcher": CloudRainIcon,
  "fertilizer-spreader": SparklesIcon,
  scarecrow: ShieldIcon,
  "grafting-tool": GitMergeIcon,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ToolWheel({
  open,
  onOpen,
  onClose,
  unlockedTools,
  selectedTool,
  level,
  onSelectTool,
  onUnlockTool,
}: ToolWheelProps) {
  // Tab key (web) toggles the wheel open/closed.
  // On mobile, the parent should wire a long-press gesture to onOpen/onClose.
  useToolWheelTabKey(() => (open ? onClose() : onOpen?.()));

  const handleSelectTool = (tool: ToolData) => {
    if (unlockedTools.includes(tool.id)) {
      onSelectTool(tool.id);
      onClose();
    } else if (level >= tool.unlockLevel) {
      onUnlockTool(tool.id);
      onSelectTool(tool.id);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/20">
        {/* Backdrop dismiss */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Close tool selector"
        />

        {/* Dialog */}
        <View
          className="mx-4 w-full max-w-xs rounded-2xl p-4 shadow-lg"
          style={{
            ...HUD_PANEL,
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        >
          {/* Header */}
          <Text
            style={{
              ...TYPE.heading,
              textAlign: "center",
              marginBottom: 12,
              color: LIGHT.textPrimary,
            }}
          >
            Tools
          </Text>

          {/* 3-column grid */}
          <ScrollView>
            <View className="flex-row flex-wrap justify-center gap-3">
              {TOOLS.map((tool) => {
                const isUnlocked = unlockedTools.includes(tool.id);
                const isSelected = selectedTool === tool.id;
                const canUnlock = level >= tool.unlockLevel;
                const IconComponent = TOOL_ICONS[tool.id] ?? WrenchIcon;

                return (
                  <Pressable
                    key={tool.id}
                    className="h-20 w-[30%] items-center justify-center rounded-xl p-2"
                    style={{
                      borderWidth: 2,
                      backgroundColor: isSelected
                        ? "rgba(76,175,80,0.15)"
                        : isUnlocked
                          ? "rgba(232,245,233,0.7)"
                          : "rgba(207,216,220,0.3)",
                      borderColor: isSelected ? ACCENT.sap : "transparent",
                      opacity: isUnlocked || canUnlock ? 1 : 0.5,
                    }}
                    disabled={!isUnlocked && !canUnlock}
                    onPress={() => handleSelectTool(tool)}
                    accessibilityLabel={`${tool.name}${!isUnlocked ? ` (unlock at level ${tool.unlockLevel})` : ""}${isSelected ? " (selected)" : ""}`}
                  >
                    <Icon
                      as={IconComponent}
                      size={24}
                      className="mb-1"
                      color={isUnlocked ? ACCENT.sap : LIGHT.textMuted}
                    />
                    <Text
                      style={{
                        ...TYPE.caption,
                        textAlign: "center",
                        color: LIGHT.textPrimary,
                      }}
                    >
                      {tool.name}
                    </Text>
                    {!isUnlocked && (
                      <Text style={{ ...TYPE.caption, color: ACCENT.amber }}>
                        Lv.{tool.unlockLevel}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
