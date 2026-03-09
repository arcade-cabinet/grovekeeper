/**
 * Animation utilities for MainMenu (Spec S26).
 *
 * Pure functions + Animated value factories for the main menu's
 * premium polish: logo glow pulse, button press scale, save card shimmer.
 *
 * Uses react-native Animated API only (no reanimated dependency).
 */
import { Animated, type ViewStyle } from "react-native";
import { ACCENT } from "@/components/ui/tokens";

// ---------------------------------------------------------------------------
// Logo glow pulse — golden text shadow oscillates between two radii
// ---------------------------------------------------------------------------

export interface GlowPulseRefs {
  anim: Animated.Value;
  loop: Animated.CompositeAnimation;
}

/** Creates a looping glow pulse animation for the logo. */
export function createGlowPulse(reduceMotion: boolean): GlowPulseRefs {
  const anim = new Animated.Value(0);
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: reduceMotion ? 0 : 2400,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 2400,
        useNativeDriver: false,
      }),
    ]),
  );
  return { anim, loop };
}

/** Interpolate the glow radius from the pulse value. */
export function interpolateGlowRadius(
  anim: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });
}

/** Interpolate the glow opacity from the pulse value. */
export function interpolateGlowOpacity(
  anim: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });
}

// ---------------------------------------------------------------------------
// Button press scale — spring-based scale-up on press
// ---------------------------------------------------------------------------

export interface ButtonScaleRefs {
  scale: Animated.Value;
}

export function createButtonScale(): ButtonScaleRefs {
  return { scale: new Animated.Value(1) };
}

export function animateButtonPressIn(scale: Animated.Value): void {
  Animated.spring(scale, {
    toValue: 0.95,
    useNativeDriver: true,
    speed: 50,
    bounciness: 4,
  }).start();
}

export function animateButtonPressOut(scale: Animated.Value): void {
  Animated.spring(scale, {
    toValue: 1,
    useNativeDriver: true,
    speed: 20,
    bounciness: 8,
  }).start();
}

// ---------------------------------------------------------------------------
// Tier card border pulse — subtle opacity oscillation on the selected card
// ---------------------------------------------------------------------------

export function createTierPulse(): Animated.Value {
  return new Animated.Value(0);
}

export function startTierPulse(
  anim: Animated.Value,
  reduceMotion: boolean,
): Animated.CompositeAnimation {
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: reduceMotion ? 0 : 1600,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 1600,
        useNativeDriver: false,
      }),
    ]),
  );
  return loop;
}

export function interpolateTierBorderWidth(
  anim: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 3.5],
  });
}

export function interpolateTierShadowOpacity(
  anim: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });
}

// ---------------------------------------------------------------------------
// Leaf particle variation — compute varied sizes and speeds
// ---------------------------------------------------------------------------

export interface VariedLeafConfig {
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  rotation: number;
  duration: number;
  delay: number;
  size: number;
  emoji: string;
}

const LEAF_EMOJIS = ["\u{1F343}", "\u{1F342}", "\u{1F341}", "\u{1F33F}", "\u{2618}\uFE0F"];

/**
 * Generate varied leaf configs with different sizes, speeds, and leaf types.
 * Uses a simple seeded spread (no Math.random — deterministic from index).
 */
export function generateVariedLeaves(count: number): VariedLeafConfig[] {
  const leaves: VariedLeafConfig[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const sizeVariation = 12 + (i % 3) * 6;
    const speedFactor = 0.7 + (i % 4) * 0.15;
    leaves.push({
      startX: 0.05 + t * 0.9,
      startY: 0.02 + (i % 5) * 0.06,
      dx: (i % 2 === 0 ? 1 : -1) * (20 + (i % 3) * 15),
      dy: 250 + (i % 4) * 50,
      rotation: (i % 2 === 0 ? 1 : -1) * (120 + (i % 3) * 40),
      duration: Math.round((8000 + (i % 5) * 1500) / speedFactor),
      delay: i * 1200,
      size: sizeVariation,
      emoji: LEAF_EMOJIS[i % LEAF_EMOJIS.length],
    });
  }
  return leaves;
}

// ---------------------------------------------------------------------------
// Permadeath ember glow — red/orange pulsing for the permadeath toggle
// ---------------------------------------------------------------------------

export function createEmberPulse(): Animated.Value {
  return new Animated.Value(0);
}

export function startEmberPulse(
  anim: Animated.Value,
  reduceMotion: boolean,
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: reduceMotion ? 0 : 1200,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 1200,
        useNativeDriver: false,
      }),
    ]),
  );
}

export function interpolateEmberBackground(
  anim: Animated.Value,
): Animated.AnimatedInterpolation<string> {
  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(239,83,80,0.08)", "rgba(239,83,80,0.18)"],
  });
}
