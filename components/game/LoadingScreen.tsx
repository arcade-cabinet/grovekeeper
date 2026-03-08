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
 * Bright whimsical Zelda aesthetic -- soft greens, warm cream.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated as RNAnimated, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, LIGHT, TYPE } from "@/components/ui/tokens";
import { Logo } from "./Logo.tsx";
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
  /** Current loading phase (0-4). Host drives this as async steps complete. */
  phase: LoadingPhase;
  /** Called once when phase transitions to 4 (loading complete). */
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
// Animated logo (gentle breathing pulse)
// ---------------------------------------------------------------------------

function AnimatedLogo({ reduceMotion }: { reduceMotion: boolean }) {
  const scale = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(scale, {
          toValue: 1.06,
          duration: 1800,
          useNativeDriver: true,
        }),
        RNAnimated.timing(scale, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale, reduceMotion]);

  return (
    <RNAnimated.View style={{ transform: [{ scale }] }}>
      <Logo size={140} />
    </RNAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ percent, reduceMotion }: { percent: number; reduceMotion: boolean }) {
  const width = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      width.setValue(percent);
      return;
    }
    RNAnimated.timing(width, {
      toValue: percent,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [percent, width, reduceMotion]);

  const animatedWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View
      style={{
        width: "100%",
        height: 10,
        borderRadius: 5,
        backgroundColor: "rgba(134,239,172,0.25)",
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
          width: animatedWidth,
          borderRadius: 5,
          backgroundColor: ACCENT.greenBright,
        }}
      />
    </View>
  );
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

    // Fade out -> update -> fade in
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
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}
    >
      {/* Animated logo */}
      <AnimatedLogo reduceMotion={reduceMotion} />

      {/* Spacer */}
      <View style={{ height: 32 }} />

      {/* Progress area */}
      <View style={{ width: "100%", maxWidth: 320, gap: 12, alignItems: "center" }}>
        {/* Phase label */}
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

        {/* Progress bar */}
        <ProgressBar percent={percent} reduceMotion={reduceMotion} />

        {/* Percent readout for accessibility */}
        <Text
          style={{
            ...TYPE.caption,
            color: LIGHT.textMuted,
          }}
        >
          {Math.round(percent)}%
        </Text>
      </View>

      {/* Spacer */}
      <View style={{ height: 40 }} />

      {/* Rotating tips */}
      <View style={{ width: "100%", maxWidth: 280 }}>
        <TipRotator reduceMotion={reduceMotion} />
      </View>
    </LinearGradient>
  );
}
