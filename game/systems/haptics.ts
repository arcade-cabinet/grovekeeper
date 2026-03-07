import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import hapticsConfig from "@/config/game/haptics.json" with { type: "json" };

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

/** The five core tool actions — mirrors GameAction but kept local to avoid circular imports. */
export type ToolAction = "DIG" | "CHOP" | "WATER" | "PLANT" | "PRUNE";

/**
 * Trigger haptic feedback on supported native platforms.
 * No-op on web. Silently swallows errors so callers never need try/catch.
 */
export async function triggerHaptic(type: HapticType): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    switch (type) {
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // expo-haptics not available (e.g. simulator without haptics support)
  }
}

/**
 * Fire haptic feedback for a tool action.
 * Pattern is sourced from config/game/haptics.json — no inline constants.
 * No-op on non-native platforms (web, desktop).
 */
export async function triggerActionHaptic(action: ToolAction): Promise<void> {
  const pattern = (hapticsConfig.toolActions as Record<string, string>)[action] as
    | HapticType
    | undefined;
  if (pattern) await triggerHaptic(pattern);
}
