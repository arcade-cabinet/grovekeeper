/**
 * Visual sub-components for LoadingScreen (Spec S1.3).
 *
 * Extracted from LoadingScreen.tsx to keep files under 300 lines.
 * Contains: SproutAnimation, VineProgressBar.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo } from "react";
import { Animated as RNAnimated, View } from "react-native";
import { ACCENT, LIGHT } from "@/components/ui/tokens";
import {
  animateSproutToPhase,
  animateVineToPercent,
  createSproutAnim,
  createVineProgress,
  interpolateCanopyOpacity,
  interpolateCanopyScale,
  interpolateSeedRadius,
  interpolateTrunkHeight,
  interpolateVineWidth,
} from "./loadingScreenAnimations.ts";
import type { LoadingPhase } from "./loadingScreenLogic.ts";

// ---------------------------------------------------------------------------
// Seed-to-tree sprouting animation
// ---------------------------------------------------------------------------

export function SproutAnimation({
  phase,
  reduceMotion,
}: {
  phase: LoadingPhase;
  reduceMotion: boolean;
}) {
  const refs = useMemo(() => createSproutAnim(), []);

  useEffect(() => {
    animateSproutToPhase(refs, phase, reduceMotion);
  }, [refs, phase, reduceMotion]);

  const seedRadius = interpolateSeedRadius(refs.growth);
  const trunkHeight = interpolateTrunkHeight(refs.growth);
  const canopyScale = interpolateCanopyScale(refs.growth);
  const canopyOpacity = interpolateCanopyOpacity(refs.growth);

  return (
    <RNAnimated.View
      style={{
        opacity: refs.opacity,
        alignItems: "center",
        justifyContent: "flex-end",
        height: 120,
        width: 120,
      }}
    >
      {/* Canopy -- green circle that scales in */}
      <RNAnimated.View
        style={{
          position: "absolute",
          top: 8,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: ACCENT.sap,
          opacity: canopyOpacity,
          transform: [{ scale: canopyScale }],
          shadowColor: ACCENT.sap,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      />
      {/* Secondary canopy leaf */}
      <RNAnimated.View
        style={{
          position: "absolute",
          top: 20,
          left: 22,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: ACCENT.greenBright,
          opacity: canopyOpacity,
          transform: [{ scale: canopyScale }],
        }}
      />

      {/* Trunk -- brown rectangle that grows upward */}
      <RNAnimated.View
        style={{
          width: 8,
          height: trunkHeight,
          backgroundColor: "#8D6E63",
          borderRadius: 4,
          marginBottom: 4,
        }}
      />

      {/* Seed -- small brown circle at the base */}
      <RNAnimated.View
        style={{
          width: RNAnimated.multiply(seedRadius, 2),
          height: RNAnimated.multiply(seedRadius, 2),
          borderRadius: 999,
          backgroundColor: "#5D4037",
        }}
      />
    </RNAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// Vine-style progress bar
// ---------------------------------------------------------------------------

export function VineProgressBar({
  percent,
  reduceMotion,
}: {
  percent: number;
  reduceMotion: boolean;
}) {
  const vine = useMemo(() => createVineProgress(), []);

  useEffect(() => {
    animateVineToPercent(vine, percent, reduceMotion);
  }, [vine, percent, reduceMotion]);

  const vineWidth = interpolateVineWidth(vine);

  return (
    <View
      style={{
        width: "100%",
        height: 12,
        borderRadius: 6,
        backgroundColor: "rgba(102,187,106,0.15)",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: LIGHT.borderBranch,
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <RNAnimated.View
        style={{
          height: "100%",
          width: vineWidth,
          borderRadius: 6,
        }}
      >
        <LinearGradient
          colors={[ACCENT.sap, ACCENT.greenBright, "#81C784"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            borderRadius: 6,
          }}
        />
      </RNAnimated.View>
    </View>
  );
}
