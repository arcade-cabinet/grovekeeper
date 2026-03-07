/**
 * WeatherOverlay -- Visual weather effect overlays.
 *
 * Renders CSS-style weather effects (rain drops, drought haze,
 * windstorm streaks) as React Native animated overlays on top of
 * the game canvas. Reads weather type to determine which effect
 * to display.
 */

import React, { useEffect, useMemo } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useGameStore } from "@/game/stores/gameStore";
import type { WeatherType } from "@/game/systems/weather";
import { scopedRNG } from "@/game/utils/seedWords";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeatherOverlayProps {
  weatherType: WeatherType;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RAIN_DROP_COUNT = 30;
const WIND_STREAK_COUNT = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Rain overlay
// ---------------------------------------------------------------------------

function RainDrop({ index, total }: { index: number; total: number }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0.6);

  const worldSeed = useGameStore((s) => s.worldSeed);
  const leftPct = useMemo(() => {
    const rng = scopedRNG("weather-rain-left", worldSeed, index);
    return (index / total) * 100 + rng() * 3;
  }, [index, total, worldSeed]);
  const _delay = useMemo(() => {
    const rng = scopedRNG("weather-rain-delay", worldSeed, index);
    return rng() * 800;
  }, [index, worldSeed]);
  const duration = useMemo(() => {
    const rng = scopedRNG("weather-rain-duration", worldSeed, index);
    return 600 + rng() * 400;
  }, [index, worldSeed]);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 0 }),
        withTiming(800, { duration, easing: Easing.linear }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: duration * 0.2 }),
        withTiming(0.3, { duration: duration * 0.8 }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
  }, [translateY, opacity, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className="absolute w-[1px] bg-blue-300/70"
      style={[
        {
          left: `${leftPct}%`,
          top: -20,
          height: 16,
          borderRadius: 1,
        },
        animatedStyle,
      ]}
    />
  );
}

function RainOverlay() {
  return (
    <>
      {Array.from({ length: RAIN_DROP_COUNT }, (_, i) => (
        <RainDrop key={`rain-${i}`} index={i} total={RAIN_DROP_COUNT} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Drought overlay
// ---------------------------------------------------------------------------

function DroughtOverlay() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.25, { duration: 2000 }), withTiming(0.15, { duration: 2000 })),
      -1,
      true,
      () => {},
      ReduceMotion.Never,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View className="absolute inset-0 bg-orange-300" style={animatedStyle} />;
}

// ---------------------------------------------------------------------------
// Windstorm overlay
// ---------------------------------------------------------------------------

function WindStreak({ index, total }: { index: number; total: number }) {
  const translateX = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const worldSeed = useGameStore((s) => s.worldSeed);
  const topPct = useMemo(() => (index / total) * 100, [index, total]);
  const duration = useMemo(() => {
    const rng = scopedRNG("weather-wind-duration", worldSeed, index);
    return 800 + rng() * 600;
  }, [index, worldSeed]);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(-100, { duration: 0 }),
        withTiming(500, { duration, easing: Easing.linear }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: duration * 0.3 }),
        withTiming(0, { duration: duration * 0.7 }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
  }, [translateX, opacity, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { rotate: "-15deg" }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className="absolute bg-gray-400/50"
      style={[
        {
          top: `${topPct}%`,
          left: -100,
          width: 60,
          height: 2,
          borderRadius: 1,
        },
        animatedStyle,
      ]}
    />
  );
}

function WindstormOverlay() {
  return (
    <>
      {/* Semi-transparent tint */}
      <View className="absolute inset-0 bg-gray-500/10" />
      {/* Wind streaks */}
      {Array.from({ length: WIND_STREAK_COUNT }, (_, i) => (
        <WindStreak key={`wind-${i}`} index={i} total={WIND_STREAK_COUNT} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reduced motion fallbacks
// ---------------------------------------------------------------------------

function StaticRainOverlay() {
  return <View className="absolute inset-0 bg-blue-300/15" />;
}

function StaticDroughtOverlay() {
  return <View className="absolute inset-0 bg-orange-300/20" />;
}

function StaticWindstormOverlay() {
  return <View className="absolute inset-0 bg-gray-400/15" />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WeatherOverlay({ weatherType }: WeatherOverlayProps) {
  const reduceMotion = useReducedMotion();

  if (weatherType === "clear") return null;

  return (
    <View
      className="absolute inset-0 overflow-hidden"
      pointerEvents="none"
      accessibilityLabel={`Weather: ${weatherType}`}
    >
      {weatherType === "rain" && (reduceMotion ? <StaticRainOverlay /> : <RainOverlay />)}
      {weatherType === "drought" && (reduceMotion ? <StaticDroughtOverlay /> : <DroughtOverlay />)}
      {weatherType === "windstorm" &&
        (reduceMotion ? <StaticWindstormOverlay /> : <WindstormOverlay />)}
    </View>
  );
}
