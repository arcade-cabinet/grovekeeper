/**
 * LoadingScreen -- 4-phase progress overlay (Spec S1.3).
 *
 * Shown between NewGameModal and the game canvas. Tracks:
 *   Phase 1: fonts loaded
 *   Phase 2: store initialised
 *   Phase 3: first chunk generated
 *   Phase 4: first frame rendered
 *
 * Host component drives `phase` from 0 (idle) to 4 (done).
 * Component calls `onComplete` once phase 4 is reached.
 *
 * Visual: animated seed-to-tree sprouting, vine progress bar, rotating tips.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated as RNAnimated, View } from "react-native";
import { Text } from "@/components/ui/text";
import { FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import { SproutAnimation, VineProgressBar } from "./LoadingScreenVisuals.tsx";
import { animateTaglineIn, createTaglineFade } from "./loadingScreenAnimations.ts";
import {
  getPhaseLabel,
  getProgressPercent,
  getTip,
  type LoadingPhase,
  tipCount,
} from "./loadingScreenLogic.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadingScreenProps {
  phase: LoadingPhase;
  onComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Reduced-motion hook
// ---------------------------------------------------------------------------

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);

  return reduced;
}

// ---------------------------------------------------------------------------
// Tip rotator
// ---------------------------------------------------------------------------

const TIP_INTERVAL_MS = 4000;

function TipRotator({ reduceMotion }: { reduceMotion: boolean }) {
  const [tipIndex, setTipIndex] = useState(0);
  const opacity = useRef(new RNAnimated.Value(1)).current;

  const advanceTip = useCallback(() => {
    if (reduceMotion) {
      setTipIndex((i) => (i + 1) % tipCount());
      return;
    }

    RNAnimated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTipIndex((i) => (i + 1) % tipCount());
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [opacity, reduceMotion]);

  useEffect(() => {
    const id = setInterval(advanceTip, TIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [advanceTip]);

  return (
    <RNAnimated.View style={{ opacity }}>
      <Text
        style={{
          ...TYPE.body,
          color: LIGHT.textSecondary,
          textAlign: "center",
          fontStyle: "italic",
          lineHeight: 20,
        }}
      >
        {getTip(tipIndex)}
      </Text>
    </RNAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// LoadingScreen
// ---------------------------------------------------------------------------

export function LoadingScreen({ phase, onComplete }: LoadingScreenProps) {
  const reduceMotion = useReducedMotion();
  const completedRef = useRef(false);

  const percent = getProgressPercent(phase);
  const label = getPhaseLabel(phase);

  // Tagline fade-in
  const taglineFade = useMemo(() => createTaglineFade(), []);
  useEffect(() => {
    animateTaglineIn(taglineFade, reduceMotion);
  }, [taglineFade, reduceMotion]);

  useEffect(() => {
    if (phase === 4 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [phase, onComplete]);

  return (
    <LinearGradient
      colors={[LIGHT.bgDeep, LIGHT.bgCanopy, LIGHT.bgWarm]}
      locations={[0, 0.5, 1]}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      {/* Animated seed-to-tree sprout */}
      <SproutAnimation phase={phase} reduceMotion={reduceMotion} />

      {/* Spacer */}
      <View style={{ height: 24 }} />

      {/* Progress area */}
      <View style={{ width: "100%", maxWidth: 320, gap: 10, alignItems: "center" }}>
        <Text
          style={{
            ...TYPE.body,
            fontWeight: "600",
            letterSpacing: 0.3,
            color: LIGHT.textPrimary,
          }}
        >
          {label}
        </Text>

        <VineProgressBar percent={percent} reduceMotion={reduceMotion} />

        <Text style={{ ...TYPE.caption, color: LIGHT.textMuted }}>{Math.round(percent)}%</Text>
      </View>

      {/* Spacer */}
      <View style={{ height: 32 }} />

      {/* Rotating tips */}
      <View style={{ width: "100%", maxWidth: 280 }}>
        <TipRotator reduceMotion={reduceMotion} />
      </View>

      {/* Tagline with fade-in */}
      <RNAnimated.View style={{ opacity: taglineFade, marginTop: 24 }}>
        <Text
          style={{
            ...TYPE.body,
            fontFamily: FONTS.display,
            color: LIGHT.textPrimary,
            textAlign: "center",
            letterSpacing: 1,
            fontSize: 13,
          }}
        >
          Every forest begins with a single seed.
        </Text>
      </RNAnimated.View>
    </LinearGradient>
  );
}
