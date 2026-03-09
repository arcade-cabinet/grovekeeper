/**
 * Animation utilities for LoadingScreen (Spec S1.3).
 *
 * Provides the seed-to-tree sprouting animation values and
 * vine-style progress bar interpolations.
 *
 * Uses react-native Animated API only (no reanimated dependency).
 */
import { Animated } from "react-native";
import type { LoadingPhase } from "./loadingScreenLogic.ts";

// ---------------------------------------------------------------------------
// Seed sprouting animation — phases map to visual growth
// ---------------------------------------------------------------------------

export interface SproutAnimRefs {
  /** 0 = seed, 1 = sprout, 2 = sapling, 3 = small tree, 4 = full tree */
  growth: Animated.Value;
  /** Overall opacity for the sprout container */
  opacity: Animated.Value;
}

export function createSproutAnim(): SproutAnimRefs {
  return {
    growth: new Animated.Value(0),
    opacity: new Animated.Value(0),
  };
}

/**
 * Animate the sprout to match the given loading phase.
 * Phase 0 = tiny seed. Phase 4 = full small tree.
 */
export function animateSproutToPhase(
  refs: SproutAnimRefs,
  phase: LoadingPhase,
  reduceMotion: boolean,
): void {
  const targetGrowth = phase / 4;
  const duration = reduceMotion ? 0 : 800;

  Animated.parallel([
    Animated.timing(refs.growth, {
      toValue: targetGrowth,
      duration,
      useNativeDriver: false,
    }),
    Animated.timing(refs.opacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 400,
      useNativeDriver: true,
    }),
  ]).start();
}

// ---------------------------------------------------------------------------
// Sprout interpolations — drive SVG-like visual properties
// ---------------------------------------------------------------------------

/** Seed circle radius: starts small, shrinks as trunk appears */
export function interpolateSeedRadius(
  growth: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return growth.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [8, 6, 4],
    extrapolate: "clamp",
  });
}

/** Trunk height: grows from 0 to full */
export function interpolateTrunkHeight(
  growth: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return growth.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: [0, 12, 40, 56],
    extrapolate: "clamp",
  });
}

/** Canopy scale: appears at phase 2, full at phase 4 */
export function interpolateCanopyScale(
  growth: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return growth.interpolate({
    inputRange: [0, 0.4, 0.75, 1],
    outputRange: [0, 0, 0.6, 1],
    extrapolate: "clamp",
  });
}

/** Canopy opacity: fades in with scale */
export function interpolateCanopyOpacity(
  growth: Animated.Value,
): Animated.AnimatedInterpolation<number> {
  return growth.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [0, 0, 0.7, 1],
    extrapolate: "clamp",
  });
}

// ---------------------------------------------------------------------------
// Vine progress bar — organic width that grows with slight overshoot
// ---------------------------------------------------------------------------

export function createVineProgress(): Animated.Value {
  return new Animated.Value(0);
}

export function animateVineToPercent(
  vine: Animated.Value,
  percent: number,
  reduceMotion: boolean,
): void {
  if (reduceMotion) {
    vine.setValue(percent);
    return;
  }
  Animated.spring(vine, {
    toValue: percent,
    useNativeDriver: false,
    speed: 6,
    bounciness: 3,
  }).start();
}

export function interpolateVineWidth(vine: Animated.Value): Animated.AnimatedInterpolation<string> {
  return vine.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });
}

// ---------------------------------------------------------------------------
// Tagline fade-in
// ---------------------------------------------------------------------------

export function createTaglineFade(): Animated.Value {
  return new Animated.Value(0);
}

export function animateTaglineIn(fade: Animated.Value, reduceMotion: boolean): void {
  Animated.timing(fade, {
    toValue: 1,
    duration: reduceMotion ? 0 : 1500,
    delay: reduceMotion ? 0 : 800,
    useNativeDriver: true,
  }).start();
}
