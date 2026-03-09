/**
 * PermadeathScreen -- shown when the player dies in permadeath mode
 * (Ironwood, or Hardwood/Sapling with permadeath enabled).
 *
 * Session is over. "Return to Menu" goes back to the main menu.
 *
 * Spec S2.1 (Ironwood: permadeath), S12.3.
 *
 * Solemn and meaningful: slow dark fade, text reveals letter by letter,
 * no respawn button. The grove is truly lost.
 */

import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

export interface PermadeathScreenProps {
  /** Whether the overlay is visible. */
  open: boolean;
  /** Callback to return to main menu. */
  onReturnToMenu: () => void;
}

const MAIN_TEXT = "Your Grove Returns to the Wild";
const SUBTITLE_TEXT = "The seeds of your knowledge remain. Carry them into your next life.";

function TypewriterText({
  text,
  style,
  delayMs,
  charInterval,
}: {
  text: string;
  style: object;
  delayMs: number;
  charInterval: number;
}) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    setVisibleChars(0);
    const startTimeout = setTimeout(() => {
      let idx = 0;
      const interval = setInterval(() => {
        idx++;
        setVisibleChars(idx);
        if (idx >= text.length) clearInterval(interval);
      }, charInterval);
      return () => clearInterval(interval);
    }, delayMs);
    return () => clearTimeout(startTimeout);
  }, [text, delayMs, charInterval]);

  return (
    <Text style={style}>
      {text.slice(0, visibleChars)}
      {visibleChars < text.length ? (
        <Text style={{ opacity: 0 }}>{text.slice(visibleChars)}</Text>
      ) : null}
    </Text>
  );
}

export function PermadeathScreen({ open, onReturnToMenu }: PermadeathScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panelFade = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      fadeAnim.setValue(0);
      panelFade.setValue(0);
      buttonFade.setValue(0);

      Animated.sequence([
        // Slow dark overlay fade (1.5s)
        Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        // Panel fades in after overlay
        Animated.timing(panelFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start();

      // Button appears after text finishes typing
      const textDuration = 1500 + 800 + MAIN_TEXT.length * 60 + 500 + SUBTITLE_TEXT.length * 40;
      const buttonTimeout = setTimeout(() => {
        Animated.timing(buttonFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }, textDuration);

      return () => clearTimeout(buttonTimeout);
    }
    fadeAnim.setValue(0);
    panelFade.setValue(0);
    buttonFade.setValue(0);
  }, [open, fadeAnim, panelFade, buttonFade]);

  if (!open) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} testID="permadeath-screen">
      <Animated.View style={[styles.panel, { opacity: panelFade }]}>
        <TypewriterText text={MAIN_TEXT} style={styles.title} delayMs={200} charInterval={60} />
        <TypewriterText
          text={SUBTITLE_TEXT}
          style={styles.subtitle}
          delayMs={MAIN_TEXT.length * 60 + 700}
          charInterval={40}
        />
        <Animated.View style={{ opacity: buttonFade }}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onReturnToMenu}
            accessibilityRole="button"
            accessibilityLabel="Return to Menu"
          >
            <Text style={styles.buttonText}>Return to Menu</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,31,15,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  panel: {
    backgroundColor: "rgba(26,58,30,0.9)",
    borderWidth: 1,
    borderColor: "rgba(156,184,159,0.3)",
    borderRadius: RADIUS.organic,
    paddingHorizontal: SPACE[5],
    paddingVertical: SPACE[7],
    alignItems: "center",
    maxWidth: 340,
    width: "85%",
  },
  title: {
    ...TYPE.hero,
    fontSize: 26,
    fontFamily: FONTS.heading,
    color: LIGHT.textMuted,
    textAlign: "center",
    marginBottom: SPACE[3],
    lineHeight: 34,
  },
  subtitle: {
    ...TYPE.body,
    color: "rgba(156,184,159,0.7)",
    textAlign: "center",
    marginBottom: SPACE[7],
    lineHeight: 20,
  },
  button: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(156,184,159,0.4)",
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE[6],
    paddingVertical: SPACE[3],
    minWidth: 200,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: "rgba(156,184,159,0.1)",
  },
  buttonText: {
    ...TYPE.heading,
    color: LIGHT.textMuted,
  },
});
