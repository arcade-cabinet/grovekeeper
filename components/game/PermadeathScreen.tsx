/**
 * PermadeathScreen -- shown when the player dies in permadeath mode
 * (Ironwood, or Hardwood/Sapling with permadeath enabled).
 *
 * Session is over. "Begin New Grove" returns to the main menu.
 *
 * Spec §2.1 (Ironwood: permadeath), §12.3.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { ACCENT, DARK, FONTS, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

export interface PermadeathScreenProps {
  /** Whether the overlay is visible. */
  open: boolean;
  /** Callback to return to main menu. */
  onReturnToMenu: () => void;
}

export function PermadeathScreen({ open, onReturnToMenu }: PermadeathScreenProps) {
  if (!open) return null;

  return (
    <View style={styles.overlay} testID="permadeath-screen">
      <View style={styles.panel}>
        <Text style={styles.title}>The Grove Is Lost</Text>
        <Text style={styles.subtitle}>
          Your grove has returned to the earth. The seeds of your knowledge remain -- carry them
          into your next life.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onReturnToMenu}
          accessibilityRole="button"
          accessibilityLabel="Begin New Grove"
        >
          <Text style={styles.buttonText}>Begin New Grove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 0, 5, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  panel: {
    backgroundColor: "rgba(10, 12, 8, 0.95)",
    borderWidth: 2,
    borderColor: ACCENT.blossom,
    borderRadius: RADIUS.organic,
    paddingHorizontal: SPACE[5],
    paddingVertical: SPACE[7],
    alignItems: "center",
    maxWidth: 340,
    width: "85%",
    shadowColor: ACCENT.blossom,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    ...TYPE.hero,
    fontFamily: FONTS.heading,
    color: ACCENT.blossom,
    textAlign: "center",
    marginBottom: SPACE[2],
    textShadowColor: "rgba(249, 168, 212, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    ...TYPE.body,
    color: DARK.textSecondary,
    textAlign: "center",
    marginBottom: SPACE[6],
    lineHeight: 20,
  },
  button: {
    backgroundColor: ACCENT.blossom,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE[6],
    paddingVertical: SPACE[3],
    minWidth: 200,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    ...TYPE.heading,
    color: DARK.bgDeep,
  },
});
