/**
 * WeatherOverlay -- Visual weather effect overlays.
 *
 * Renders CSS-style weather effects (rain drops, drought haze,
 * windstorm streaks) as React Native animated overlays on top of
 * the game canvas. Reads ECS WeatherComponent for intensity and
 * wind direction to scale animations. See GAME_SPEC.md §12.
 */

import { useEntities } from "miniplex-react";
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
import { weatherQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores/gameStore";
import type { WeatherType } from "@/game/systems/weather";
import { scopedRNG } from "@/game/utils/seedWords";
import {
  computeDropDuration,
  computeIntensityOpacity,
  computeRainDropCount,
  computeWindAngleDeg,
  computeWindStreakCount,
} from "./weatherOverlayLogic";

export interface WeatherOverlayProps {
  weatherType: WeatherType;
}

// Fixed counts derived from config at intensity=1 — array size must not vary (Rules of Hooks)
const MAX_RAIN_DROPS = computeRainDropCount(1.0);
const MAX_WIND_STREAKS = computeWindStreakCount(1.0);

// ECS hook: reads intensity + windDirection from WeatherComponent singleton
function useWeatherECS() {
  useEntities(weatherQuery);
  const w = weatherQuery.first?.weather;
  return {
    intensity: w?.intensity ?? 1.0,
    windDirection: (w?.windDirection ?? [0, -1]) as [number, number],
    windSpeed: w?.windSpeed ?? 1.0,
  };
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// --- Rain ---

function RainDrop({ index, total, intensity }: { index: number; total: number; intensity: number }) {
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
  const baseDuration = useMemo(() => {
    const rng = scopedRNG("weather-rain-duration", worldSeed, index);
    return 600 + rng() * 400;
  }, [index, worldSeed]);
  const duration = computeDropDuration(baseDuration, intensity);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 0 }),
        withTiming(800, { duration, easing: Easing.linear }),
      ),
      -1, false, () => {}, ReduceMotion.Never,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(computeIntensityOpacity(0.7, intensity), { duration: duration * 0.2 }),
        withTiming(computeIntensityOpacity(0.3, intensity), { duration: duration * 0.8 }),
      ),
      -1, false, () => {}, ReduceMotion.Never,
    );
  }, [translateY, opacity, duration, intensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className="absolute w-[1px] bg-blue-300/70"
      style={[{ left: `${leftPct}%`, top: -20, height: 16, borderRadius: 1 }, animatedStyle]}
    />
  );
}

function RainOverlay({ intensity }: { intensity: number }) {
  return (
    <>
      {Array.from({ length: MAX_RAIN_DROPS }, (_, i) => (
        <RainDrop key={`rain-${i}`} index={i} total={MAX_RAIN_DROPS} intensity={intensity} />
      ))}
    </>
  );
}

// --- Drought ---

function DroughtOverlay({ intensity }: { intensity: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(computeIntensityOpacity(0.25, intensity), { duration: 2000 }),
        withTiming(computeIntensityOpacity(0.15, intensity), { duration: 2000 }),
      ),
      -1, true, () => {}, ReduceMotion.Never,
    );
  }, [opacity, intensity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View className="absolute inset-0 bg-orange-300" style={animatedStyle} />;
}

// --- Windstorm ---

function WindStreak({
  index, total, intensity, windAngleDeg,
}: { index: number; total: number; intensity: number; windAngleDeg: number }) {
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
      -1, false, () => {}, ReduceMotion.Never,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(computeIntensityOpacity(0.4, intensity), { duration: duration * 0.3 }),
        withTiming(0, { duration: duration * 0.7 }),
      ),
      -1, false, () => {}, ReduceMotion.Never,
    );
  }, [translateX, opacity, duration, intensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { rotate: `-${windAngleDeg.toFixed(1)}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className="absolute bg-gray-400/50"
      style={[{ top: `${topPct}%`, left: -100, width: 60, height: 2, borderRadius: 1 }, animatedStyle]}
    />
  );
}

function WindstormOverlay({ intensity, windAngleDeg }: { intensity: number; windAngleDeg: number }) {
  return (
    <>
      <View className="absolute inset-0 bg-gray-500/10" style={{ opacity: computeIntensityOpacity(1.0, intensity) }} />
      {Array.from({ length: MAX_WIND_STREAKS }, (_, i) => (
        <WindStreak key={`wind-${i}`} index={i} total={MAX_WIND_STREAKS} intensity={intensity} windAngleDeg={windAngleDeg} />
      ))}
    </>
  );
}

// --- Reduced motion fallbacks ---

function StaticRainOverlay() { return <View className="absolute inset-0 bg-blue-300/15" />; }
function StaticDroughtOverlay() { return <View className="absolute inset-0 bg-orange-300/20" />; }
function StaticWindstormOverlay() { return <View className="absolute inset-0 bg-gray-400/15" />; }

// --- Main component ---

export function WeatherOverlay({ weatherType }: WeatherOverlayProps) {
  const reduceMotion = useReducedMotion();
  const { intensity, windDirection } = useWeatherECS();
  const windAngleDeg = computeWindAngleDeg(windDirection);

  if (weatherType === "clear") return null;

  return (
    <View
      className="absolute inset-0 overflow-hidden"
      pointerEvents="none"
      accessibilityLabel={`Weather: ${weatherType}`}
    >
      {weatherType === "rain" && (reduceMotion ? <StaticRainOverlay /> : <RainOverlay intensity={intensity} />)}
      {weatherType === "drought" && (reduceMotion ? <StaticDroughtOverlay /> : <DroughtOverlay intensity={intensity} />)}
      {weatherType === "windstorm" && (reduceMotion ? <StaticWindstormOverlay /> : <WindstormOverlay intensity={intensity} windAngleDeg={windAngleDeg} />)}
    </View>
  );
}
