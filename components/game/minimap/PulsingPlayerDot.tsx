/**
 * PulsingPlayerDot -- animated SVG circle for the player position indicator.
 *
 * Uses react-native-reanimated to pulse opacity, respecting system
 * prefers-reduced-motion via ReduceMotion.System.
 */

import React, { useEffect } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Circle as SvgCircle } from "react-native-svg";

import { PLAYER_FILL, PLAYER_STROKE } from "./colors.ts";

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

export function PulsingPlayerDot({ cx, cy }: { cx: number; cy: number }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.System,
    );
  }, [opacity]);

  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  return (
    <AnimatedSvgCircle
      cx={cx}
      cy={cy}
      r={4}
      fill={PLAYER_FILL}
      stroke={PLAYER_STROKE}
      strokeWidth={1.5}
      animatedProps={animatedProps}
    />
  );
}
