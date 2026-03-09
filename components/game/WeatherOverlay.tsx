/**
 * WeatherOverlay -- Visual weather effect overlays.
 *
 * Renders CSS-style weather effects (rain drops, snow flakes, drought haze,
 * windstorm streaks, fog, thunderstorm flash) as React Native animated overlays
 * on top of the game canvas. Self-drives from ECS WeatherComponent: reads
 * weatherType, intensity, and wind direction. See GAME_SPEC.md §12, §36.
 *
 * Supports all 6 ECS weather types:
 *   clear        -> null (no overlay)
 *   rain         -> blue rain drop streaks
 *   snow         -> white sphere flakes (slow fall)
 *   fog          -> translucent white haze
 *   drought      -> amber/orange tinted haze (from legacy weather system)
 *   windstorm    -> gray streaks + dust tint
 *   thunderstorm -> rain drops + periodic lightning flash
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
import { useGameStore } from "@/game/stores";
import { scopedRNG } from "@/game/utils/seedWords";
import {
  computeDropDuration,
  computeIntensityOpacity,
  computeRainDropCount,
  computeWindAngleDeg,
  computeWindStreakCount,
} from "./weatherOverlayLogic.ts";

/** All weather types from both the legacy system and the ECS WeatherComponent. */
type OverlayWeatherType =
  | "clear"
  | "rain"
  | "snow"
  | "fog"
  | "drought"
  | "windstorm"
  | "thunderstorm";

// Fixed counts derived from config at intensity=1 — array size must not vary (Rules of Hooks)
const MAX_RAIN_DROPS = computeRainDropCount(1.0);
const MAX_WIND_STREAKS = computeWindStreakCount(1.0);

// ECS hook: reads weatherType + intensity + windDirection from WeatherComponent singleton
function useWeatherECS() {
  useEntities(weatherQuery);
  const w = weatherQuery.first?.weather;
  return {
    weatherType: (w?.weatherType ?? "clear") as OverlayWeatherType,
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

function RainDrop({
  index,
  total,
  intensity,
}: {
  index: number;
  total: number;
  intensity: number;
}) {
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
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(computeIntensityOpacity(0.7, intensity), { duration: duration * 0.2 }),
        withTiming(computeIntensityOpacity(0.3, intensity), { duration: duration * 0.8 }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
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
      -1,
      true,
      () => {},
      ReduceMotion.Never,
    );
  }, [opacity, intensity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View className="absolute inset-0 bg-orange-300" style={animatedStyle} />;
}

// --- Windstorm ---

function WindStreak({
  index,
  total,
  intensity,
  windAngleDeg,
}: {
  index: number;
  total: number;
  intensity: number;
  windAngleDeg: number;
}) {
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
        withTiming(computeIntensityOpacity(0.4, intensity), { duration: duration * 0.3 }),
        withTiming(0, { duration: duration * 0.7 }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
  }, [translateX, opacity, duration, intensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { rotate: `-${windAngleDeg.toFixed(1)}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className="absolute bg-gray-400/50"
      style={[
        { top: `${topPct}%`, left: -100, width: 60, height: 2, borderRadius: 1 },
        animatedStyle,
      ]}
    />
  );
}

function WindstormOverlay({
  intensity,
  windAngleDeg,
}: {
  intensity: number;
  windAngleDeg: number;
}) {
  return (
    <>
      <View
        className="absolute inset-0 bg-gray-500/10"
        style={{ opacity: computeIntensityOpacity(1.0, intensity) }}
      />
      {Array.from({ length: MAX_WIND_STREAKS }, (_, i) => (
        <WindStreak
          key={`wind-${i}`}
          index={i}
          total={MAX_WIND_STREAKS}
          intensity={intensity}
          windAngleDeg={windAngleDeg}
        />
      ))}
    </>
  );
}

// --- Snow ---

/** Maximum snowflake count at full intensity. */
const MAX_SNOWFLAKES = computeRainDropCount(1.0);

function Snowflake({
  index,
  total,
  intensity,
}: {
  index: number;
  total: number;
  intensity: number;
}) {
  const translateY = useSharedValue(-10);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const worldSeed = useGameStore((s) => s.worldSeed);

  const leftPct = useMemo(() => {
    const rng = scopedRNG("weather-snow-left", worldSeed, index);
    return (index / total) * 100 + rng() * 4;
  }, [index, total, worldSeed]);
  const baseDuration = useMemo(() => {
    const rng = scopedRNG("weather-snow-duration", worldSeed, index);
    return 2000 + rng() * 2000;
  }, [index, worldSeed]);
  const drift = useMemo(() => {
    const rng = scopedRNG("weather-snow-drift", worldSeed, index);
    return (rng() - 0.5) * 60;
  }, [index, worldSeed]);
  const _startDelay = useMemo(() => {
    const rng = scopedRNG("weather-snow-delay", worldSeed, index);
    return rng() * baseDuration;
  }, [index, worldSeed, baseDuration]);
  const duration = computeDropDuration(baseDuration, intensity * 0.5);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 0 }),
        withTiming(900, { duration, easing: Easing.linear }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
    translateX.value = withRepeat(
      withSequence(withTiming(0, { duration: 0 }), withTiming(drift, { duration })),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(computeIntensityOpacity(0.8, intensity), { duration: duration * 0.15 }),
        withTiming(computeIntensityOpacity(0.5, intensity), { duration: duration * 0.7 }),
        withTiming(0, { duration: duration * 0.15 }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
  }, [translateY, translateX, opacity, duration, drift, intensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${leftPct}%`,
          top: -10,
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.9)",
        },
        animatedStyle,
      ]}
    />
  );
}

function SnowOverlay({ intensity }: { intensity: number }) {
  return (
    <>
      {Array.from({ length: MAX_SNOWFLAKES }, (_, i) => (
        <Snowflake key={`snow-${i}`} index={i} total={MAX_SNOWFLAKES} intensity={intensity} />
      ))}
    </>
  );
}

// --- Fog ---

function FogOverlay({ intensity }: { intensity: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(computeIntensityOpacity(0.35, intensity), { duration: 3000 }),
        withTiming(computeIntensityOpacity(0.2, intensity), { duration: 3000 }),
      ),
      -1,
      true,
      () => {},
      ReduceMotion.Never,
    );
  }, [opacity, intensity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View className="absolute inset-0 bg-white" style={animatedStyle} />;
}

// --- Thunderstorm (rain + periodic lightning flash) ---

function LightningFlash({ intensity }: { intensity: number }) {
  const opacity = useSharedValue(0);
  const flashDuration = 120;
  const cycleLength = 4000;
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: cycleLength - flashDuration * 2 }),
        withTiming(computeIntensityOpacity(0.6, intensity), { duration: flashDuration }),
        withTiming(0, { duration: flashDuration }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.Never,
    );
  }, [opacity, intensity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View className="absolute inset-0 bg-white" style={animatedStyle} />;
}

function ThunderstormOverlay({ intensity }: { intensity: number }) {
  return (
    <>
      <RainOverlay intensity={intensity} />
      <LightningFlash intensity={intensity} />
    </>
  );
}

// --- Reduced motion fallbacks ---

function StaticRainOverlay() {
  return <View className="absolute inset-0 bg-blue-300/15" />;
}
function StaticDroughtOverlay() {
  return <View className="absolute inset-0 bg-orange-300/20" />;
}
function StaticWindstormOverlay() {
  return <View className="absolute inset-0 bg-gray-400/15" />;
}
function StaticSnowOverlay() {
  return <View className="absolute inset-0 bg-white/10" />;
}
function StaticFogOverlay() {
  return <View className="absolute inset-0 bg-white/20" />;
}
function StaticThunderstormOverlay() {
  return <View className="absolute inset-0 bg-blue-300/20" />;
}

// --- Self-driving main component (reads weatherType from ECS) ---

/**
 * WeatherOverlay -- self-drives from ECS WeatherComponent.
 * Mount once in the game screen; no props required.
 * Returns null when weather is clear or no weather entity exists.
 */
export function WeatherOverlay() {
  const reduceMotion = useReducedMotion();
  const { intensity, windDirection, weatherType } = useWeatherECS();
  const windAngleDeg = computeWindAngleDeg(windDirection);

  if (!weatherType || weatherType === "clear") return null;

  return (
    <View
      className="absolute inset-0 overflow-hidden"
      pointerEvents="none"
      accessibilityLabel={`Weather: ${weatherType}`}
    >
      {weatherType === "rain" &&
        (reduceMotion ? <StaticRainOverlay /> : <RainOverlay intensity={intensity} />)}
      {weatherType === "drought" &&
        (reduceMotion ? <StaticDroughtOverlay /> : <DroughtOverlay intensity={intensity} />)}
      {weatherType === "windstorm" &&
        (reduceMotion ? (
          <StaticWindstormOverlay />
        ) : (
          <WindstormOverlay intensity={intensity} windAngleDeg={windAngleDeg} />
        ))}
      {weatherType === "snow" &&
        (reduceMotion ? <StaticSnowOverlay /> : <SnowOverlay intensity={intensity} />)}
      {weatherType === "fog" &&
        (reduceMotion ? <StaticFogOverlay /> : <FogOverlay intensity={intensity} />)}
      {weatherType === "thunderstorm" &&
        (reduceMotion ? (
          <StaticThunderstormOverlay />
        ) : (
          <ThunderstormOverlay intensity={intensity} />
        ))}
    </View>
  );
}
