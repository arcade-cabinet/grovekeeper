/**
 * DeathScreen -- shown when the player dies in non-permadeath mode.
 * "Return to Fire" respawns at last campfire with partial resource loss already applied.
 *
 * Spec S12.3 (death), S12.5 (respawn at campfire).
 *
 * Zelda fairy-revival feel: semi-transparent overlay on the game world,
 * warm ember glow panel, dramatic but hopeful.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

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
    backgroundColor: "rgba(239,83,80,0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  panel: {
    backgroundColor: "rgba(255,255,255,0.9)",
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
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    ...TYPE.hero,
    fontFamily: FONTS.heading,
    color: ACCENT.ember,
    textAlign: "center",
    marginBottom: SPACE[2],
    textShadowColor: "rgba(239, 68, 68, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    ...TYPE.body,
    color: LIGHT.textSecondary,
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
    color: "#FFF",
  },
});
