/**
 * pauseMenuAnimations.ts -- Animation utilities for PauseMenu.
 *
 * Uses React Native Animated API for slide-in from right and
 * tab content crossfade transitions.
 */

import { Animated, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ---------------------------------------------------------------------------
// Slide-in from right
// ---------------------------------------------------------------------------

/**
 * Create an Animated.Value for the panel's horizontal slide.
 * Starts off-screen to the right.
 */
export function createSlideAnim(): Animated.Value {
  return new Animated.Value(SCREEN_WIDTH);
}

/**
 * Animate the panel sliding in from the right.
 */
export function slideIn(anim: Animated.Value, duration = 300): void {
  Animated.spring(anim, {
    toValue: 0,
    useNativeDriver: true,
    tension: 65,
    friction: 11,
  }).start();
}

/**
 * Animate the panel sliding out to the right.
 */
export function slideOut(anim: Animated.Value, duration = 250, onComplete?: () => void): void {
  Animated.timing(anim, {
    toValue: SCREEN_WIDTH,
    duration,
    useNativeDriver: true,
  }).start(onComplete);
}

// ---------------------------------------------------------------------------
// Tab crossfade
// ---------------------------------------------------------------------------

/**
 * Create an Animated.Value for tab content opacity. Starts at 1.
 */
export function createFadeAnim(): Animated.Value {
  return new Animated.Value(1);
}

/**
 * Crossfade: fade out, call onSwitch (to swap content), then fade in.
 */
export function crossfadeTab(anim: Animated.Value, onSwitch: () => void, duration = 150): void {
  Animated.timing(anim, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  }).start(() => {
    onSwitch();
    Animated.timing(anim, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  });
}

// ---------------------------------------------------------------------------
// Backdrop fade
// ---------------------------------------------------------------------------

export function createBackdropAnim(): Animated.Value {
  return new Animated.Value(0);
}

export function fadeBackdropIn(anim: Animated.Value, duration = 200): void {
  Animated.timing(anim, {
    toValue: 1,
    duration,
    useNativeDriver: true,
  }).start();
}

export function fadeBackdropOut(
  anim: Animated.Value,
  duration = 200,
  onComplete?: () => void,
): void {
  Animated.timing(anim, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  }).start(onComplete);
}
