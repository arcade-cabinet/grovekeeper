/**
 * DeathScreen -- shown when the player dies in non-permadeath mode.
 * "Return to Fire" respawns at last campfire with partial resource loss already applied.
 *
 * Spec §12.3 (death), §12.5 (respawn at campfire).
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { ACCENT, DARK, FONTS, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

export interface DeathScreenProps {
  /** Whether the overlay is visible. */
  open: boolean;
  /** Callback to respawn: transitions screen back to "playing". */
  onRespawn: () => void;
}

export function DeathScreen({ open, onRespawn }: DeathScreenProps) {
  if (!open) return null;

  return (
    <View style={styles.overlay} testID="death-screen">
      <View style={styles.panel}>
        <Text style={styles.title}>You Have Fallen</Text>
        <Text style={styles.subtitle}>
          The grove mourns your passing. Some resources were lost to the wilds.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onRespawn}
          accessibilityRole="button"
          accessibilityLabel="Return to Fire"
        >
          <Text style={styles.buttonText}>Return to Fire</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 5, 5, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  panel: {
    backgroundColor: "rgba(10, 12, 8, 0.95)",
    borderWidth: 2,
    borderColor: ACCENT.ember,
    borderRadius: RADIUS.organic,
    paddingHorizontal: SPACE[5],
    paddingVertical: SPACE[7],
    alignItems: "center",
    maxWidth: 340,
    width: "85%",
    shadowColor: ACCENT.ember,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    ...TYPE.hero,
    fontFamily: FONTS.heading,
    color: ACCENT.ember,
    textAlign: "center",
    marginBottom: SPACE[2],
    textShadowColor: "rgba(239, 68, 68, 0.5)",
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
    backgroundColor: ACCENT.ember,
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
