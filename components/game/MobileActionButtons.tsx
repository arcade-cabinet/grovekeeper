/**
 * MobileActionButtons -- Quick-action buttons for mobile gameplay.
 *
 * Displays context-sensitive Plant/Water/Harvest/Prune action buttons
 * at the bottom of the screen. Only the relevant button is highlighted
 * based on the current tool + selected tile state.
 */

import type { LucideIcon } from "lucide-react-native";
import { AxeIcon, DropletsIcon, ScissorsIcon, SproutIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MobileAction {
  id: string;
  label: string;
  icon: LucideIcon;
  toolId: string;
  enabled: boolean;
}

export interface MobileActionButtonsProps {
  selectedTool: string;
  actions: MobileAction[];
  onSelectTool: (toolId: string) => void;
  onAction: () => void;
}

// ---------------------------------------------------------------------------
// Default actions
// ---------------------------------------------------------------------------

export function getDefaultMobileActions(
  _selectedTool: string,
  hasEmptyTile: boolean,
  hasYoungTree: boolean,
  hasMatureTree: boolean,
): MobileAction[] {
  return [
    {
      id: "plant",
      label: "Plant",
      icon: SproutIcon,
      toolId: "trowel",
      enabled: hasEmptyTile,
    },
    {
      id: "water",
      label: "Water",
      icon: DropletsIcon,
      toolId: "watering-can",
      enabled: hasYoungTree,
    },
    {
      id: "prune",
      label: "Prune",
      icon: ScissorsIcon,
      toolId: "pruning-shears",
      enabled: hasMatureTree,
    },
    {
      id: "harvest",
      label: "Harvest",
      icon: AxeIcon,
      toolId: "axe",
      enabled: hasMatureTree,
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MobileActionButtons({
  selectedTool,
  actions,
  onSelectTool,
  onAction,
}: MobileActionButtonsProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {actions.map((action) => {
        const isActive = selectedTool === action.toolId;

        return (
          <Pressable
            key={action.id}
            className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border-2 px-3 py-1.5 ${
              isActive
                ? "border-yellow-400 bg-forest-green shadow-lg"
                : action.enabled
                  ? "border-bark-brown/40 bg-parchment/90"
                  : "border-gray-400 bg-gray-300/60 opacity-50"
            }`}
            disabled={!action.enabled}
            onPress={() => {
              if (isActive) {
                onAction();
              } else {
                onSelectTool(action.toolId);
              }
            }}
            accessibilityLabel={`${action.label}${isActive ? " (active, tap to execute)" : ""}`}
          >
            <Icon
              as={action.icon}
              size={20}
              className={isActive ? "text-white" : "text-soil-dark"}
            />
            <Text
              className={`mt-0.5 text-[10px] font-bold ${isActive ? "text-white" : "text-soil-dark"}`}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
