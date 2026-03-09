/**
 * ActionButton -- Large circular gradient action button.
 *
 * Restores all features from the original BabylonJS web version:
 * - Large circular shape with tool-specific gradient colors
 * - Tool-specific emoji icons
 * - Active press scale animation (Reanimated)
 * - Disabled grayscale/opacity state
 * - Context-sensitive label based on tool + tile state
 */

import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TileState {
  occupied: boolean;
  treeStage: number;
  cellType: string;
}

export interface ActionButtonProps {
  selectedTool: string;
  tileState: TileState | null;
  onAction: () => void;
}

// ---------------------------------------------------------------------------
// Tool visual config
// ---------------------------------------------------------------------------

interface ToolVisual {
  icon: string;
  colors: [string, string]; // gradient start, end
  borderColor: string;
}

const TOOL_VISUALS: Record<string, ToolVisual> = {
  trowel: {
    icon: "\u{1F331}", // seedling
    colors: ["#4CAF50", "#2D5A27"],
    borderColor: "#1B5E20",
  },
  "watering-can": {
    icon: "\u{1F4A7}", // droplet
    colors: ["#42A5F5", "#1565C0"],
    borderColor: "#0D47A1",
  },
  "pruning-shears": {
    icon: "\u2702\uFE0F", // scissors
    colors: ["#FF7043", "#D84315"],
    borderColor: "#BF360C",
  },
  axe: {
    icon: "\u{1FA93}", // axe
    colors: ["#F44336", "#B71C1C"],
    borderColor: "#8B0000",
  },
  shovel: {
    icon: "\u26CF\uFE0F", // pick
    colors: ["#8D6E63", "#4E342E"],
    borderColor: "#3E2723",
  },
  "compost-bin": {
    icon: "\u267B\uFE0F", // recycle
    colors: ["#66BB6A", "#2E7D32"],
    borderColor: "#1B5E20",
  },
  almanac: {
    icon: "\u{1F4D6}", // book
    colors: ["#AB47BC", "#6A1B9A"],
    borderColor: "#4A148C",
  },
};

const DEFAULT_VISUAL: ToolVisual = {
  icon: "\u2B50", // star
  colors: ["#9E9E9E", "#616161"],
  borderColor: "#424242",
};

const DISABLED_COLORS: [string, string] = ["#BDBDBD", "#9E9E9E"];
const DISABLED_BORDER = "#757575";

// ---------------------------------------------------------------------------
// Action label logic
// ---------------------------------------------------------------------------

export function getActionLabel(
  selectedTool: string,
  tile: TileState | null,
): { label: string; enabled: boolean } {
  if (!tile) {
    return { label: "ACTION", enabled: false };
  }

  const { occupied, treeStage, cellType } = tile;
  const isSoil = cellType === "soil";
  const isBlocked = cellType === "rock";

  switch (selectedTool) {
    case "trowel":
      if (!occupied && isSoil) return { label: "PLANT", enabled: true };
      return { label: "PLANT", enabled: false };

    case "watering-can":
      if (occupied && treeStage >= 0 && treeStage <= 2) return { label: "WATER", enabled: true };
      return { label: "WATER", enabled: false };

    case "pruning-shears":
      if (occupied && treeStage >= 3 && treeStage <= 4) return { label: "PRUNE", enabled: true };
      return { label: "PRUNE", enabled: false };

    case "axe":
      if (occupied && treeStage >= 3) return { label: "CHOP", enabled: true };
      return { label: "CHOP", enabled: false };

    case "shovel":
      if (isBlocked) return { label: "CLEAR", enabled: true };
      return { label: "CLEAR", enabled: false };

    case "compost-bin":
      if (occupied) return { label: "COMPOST", enabled: true };
      return { label: "COMPOST", enabled: false };

    case "almanac":
      if (occupied) return { label: "INSPECT", enabled: true };
      return { label: "INSPECT", enabled: false };

    default:
      return { label: "ACTION", enabled: false };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActionButton({ selectedTool, tileState, onAction }: ActionButtonProps) {
  const { label, enabled } = getActionLabel(selectedTool, tileState);
  const visual = TOOL_VISUALS[selectedTool] ?? DEFAULT_VISUAL;

  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  // Animate enabled/disabled transition
  const enabledValue = useSharedValue(enabled ? 1 : 0);

  useEffect(() => {
    enabledValue.value = withSpring(enabled ? 1 : 0, {
      damping: 20,
      stiffness: 150,
    });
  }, [enabled, enabledValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: enabledValue.value * 0.45 + 0.55, // 0.55 when disabled, 1.0 when enabled
  }));

  const handlePressIn = () => {
    if (!enabled) return;
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    pressed.value = 1;
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    pressed.value = 0;
  };

  const gradientColors = enabled ? visual.colors : DISABLED_COLORS;
  const borderColor = enabled ? visual.borderColor : DISABLED_BORDER;

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPress={enabled ? onAction : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!enabled}
      accessibilityLabel={`${label} action`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      testID="btn-action"
    >
      <View
        className="items-center justify-center overflow-hidden rounded-full"
        style={{
          width: 80,
          height: 80,
          borderWidth: 3,
          borderColor,
          // Shadow for depth
          shadowColor: enabled ? visual.colors[0] : "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: enabled ? 0.4 : 0.15,
          shadowRadius: 8,
          elevation: enabled ? 8 : 2,
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        {/* Tool icon */}
        <Text style={{ fontSize: 24, marginBottom: 2 }} accessibilityElementsHidden>
          {visual.icon}
        </Text>
        {/* Action label */}
        <Text
          className="text-xs font-bold tracking-wider text-white"
          style={{
            textShadowColor: "rgba(0,0,0,0.3)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
