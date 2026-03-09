/**
 * DeathScreen -- shown when the player dies in non-permadeath mode.
 * "Return to Fire" respawns at last campfire with partial resource loss already applied.
 *
 * Spec S12.3 (death), S12.5 (respawn at campfire).
 *
 * Zelda fairy-revival feel: fade-in overlay on the game world,
 * warm ember glow panel with pulsing border, floating ember particles.
 */

import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

export interface DeathScreenProps {
  /** Whether the overlay is visible. */
  open: boolean;
  /** Callback to respawn: transitions screen back to "playing". */
  onRespawn: () => void;
}

// -- Ember particle (floating orange dot rising upward) -----------------------

function EmberParticle({ delay, left }: { delay: number; left: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -200, duration: 3000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: 500, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 2500, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => animate());
    };
    animate();
    return () => {
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [delay, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: `${left}%` as unknown as number,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    />
  );
}

// -- Embers field (12 particles scattered across the screen) ------------------

const EMBER_CONFIGS = [
  { delay: 0, left: 15 },
  { delay: 400, left: 30 },
  { delay: 800, left: 50 },
  { delay: 200, left: 70 },
  { delay: 600, left: 85 },
  { delay: 1000, left: 25 },
  { delay: 300, left: 60 },
  { delay: 700, left: 40 },
  { delay: 100, left: 10 },
  { delay: 500, left: 75 },
  { delay: 900, left: 55 },
  { delay: 1200, left: 90 },
];

function EmberField() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {EMBER_CONFIGS.map((cfg, i) => (
        <EmberParticle key={`ember-${i}`} delay={cfg.delay} left={cfg.left} />
      ))}
    </View>
  );
}

export function DeathScreen({ open, onRespawn }: DeathScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const borderGlow = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    if (open) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      // Pulsing border glow
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(borderGlow, { toValue: 0.6, duration: 1200, useNativeDriver: false }),
          Animated.timing(borderGlow, { toValue: 0.2, duration: 1200, useNativeDriver: false }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    fadeAnim.setValue(0);
  }, [open, fadeAnim, borderGlow]);

  if (!open) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} testID="death-screen">
      <EmberField />
      <Animated.View style={[styles.panel, { shadowOpacity: borderGlow }]}>
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
      </Animated.View>
    </Animated.View>
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
    shadowColor: ACCENT.ember,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    ...TYPE.heading,
    color: "#FFF",
  },
  ember: {
    position: "absolute",
    bottom: "20%",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT.ember,
  },
});
