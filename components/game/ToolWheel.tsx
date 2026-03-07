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
import type { ToolData } from "@/game/config/tools";
import { TOOLS } from "@/game/config/tools";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ToolWheelProps {
  open: boolean;
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
// Colors (from original COLORS constant)
// ---------------------------------------------------------------------------

const COLORS = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
  autumnGold: "#FFB74D",
  skyMist: "#E8F5E9",
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ToolWheel({
  open,
  onClose,
  unlockedTools,
  selectedTool,
  level,
  onSelectTool,
  onUnlockTool,
}: ToolWheelProps) {
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
      <View className="flex-1 items-center justify-center bg-black/40">
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
            backgroundColor: COLORS.skyMist,
            borderWidth: 3,
            borderColor: `${COLORS.forestGreen}40`,
          }}
        >
          {/* Header */}
          <Text
            className="mb-3 text-center font-heading text-lg font-bold"
            style={{ color: COLORS.soilDark }}
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
                    className="h-20 w-[30%] items-center justify-center rounded-xl border-2 p-2"
                    style={{
                      backgroundColor: isSelected
                        ? `${COLORS.leafLight}40`
                        : isUnlocked
                          ? "#FFFFFF"
                          : `${COLORS.soilDark}20`,
                      borderColor: isSelected ? COLORS.forestGreen : "transparent",
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
                      color={isUnlocked ? COLORS.forestGreen : COLORS.barkBrown}
                    />
                    <Text className="text-center text-xs" style={{ color: COLORS.soilDark }}>
                      {tool.name}
                    </Text>
                    {!isUnlocked && (
                      <Text className="text-xs" style={{ color: COLORS.autumnGold }}>
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
