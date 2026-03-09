/**
 * ActionButtons — Context-aware mobile action buttons (Spec §23).
 *
 * Shows a single contextual action button that changes based on what
 * the player is looking at (via useTargetHit raycast). The button
 * label and icon update automatically:
 *
 *   CHOP (tree+axe), WATER (crop+watering-can), TALK (npc),
 *   ATTACK (enemy), HARVEST (crop), PRUNE (tree+shears),
 *   INTERACT (structure), USE (nothing targeted — disabled).
 *
 * Renders as React Native HUD overlay outside the R3F Canvas.
 * Touch target >= 44px, positioned at bottom-center of screen.
 */

import type { LucideIcon } from "lucide-react-native";
import {
  AxeIcon,
  DropletsIcon,
  MessageCircleIcon,
  PickaxeIcon,
  ScissorsIcon,
  SproutIcon,
  SwordIcon,
  WrenchIcon,
} from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTargetHit } from "@/game/hooks/useRaycast";
import { useGameStore } from "@/game/stores";

import { resolveContextAction } from "./contextActionLogic.ts";

// ─── Label → icon mapping ─────────────────────────────────────────────────────

const LABEL_ICONS: Record<string, LucideIcon> = {
  CHOP: AxeIcon,
  WATER: DropletsIcon,
  PRUNE: ScissorsIcon,
  HARVEST: AxeIcon,
  PLANT: SproutIcon,
  TALK: MessageCircleIcon,
  ATTACK: SwordIcon,
  INTERACT: WrenchIcon,
  USE: PickaxeIcon,
};

function getIconForLabel(label: string): LucideIcon {
  return LABEL_ICONS[label] ?? PickaxeIcon;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface ActionButtonsProps {
  onAction: () => void;
}

export function ActionButtons({ onAction }: ActionButtonsProps) {
  const hit = useTargetHit();
  const selectedTool = useGameStore((s) => s.selectedTool);

  const targetType = hit?.entityType ?? null;
  const action = resolveContextAction(targetType, selectedTool);
  const ActionIcon = getIconForLabel(action.label);

  return (
    <View className="items-center">
      <Pressable
        className={`min-h-[56px] min-w-[56px] items-center justify-center rounded-2xl border-2 px-4 py-2 ${
          action.enabled
            ? "border-yellow-400 bg-forest-green shadow-lg"
            : "border-gray-400 bg-gray-300/60 opacity-50"
        }`}
        disabled={!action.enabled}
        onPress={action.enabled ? onAction : undefined}
        accessibilityLabel={`${action.label} action`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !action.enabled }}
        testID="btn-context-action"
      >
        <Icon
          as={ActionIcon}
          size={24}
          className={action.enabled ? "text-white" : "text-soil-dark"}
        />
        <Text
          className={`mt-0.5 text-xs font-bold tracking-wider ${
            action.enabled ? "text-white" : "text-soil-dark"
          }`}
        >
          {action.label}
        </Text>
      </Pressable>
    </View>
  );
}
