/**
 * LoadingScreen -- 4-phase progress overlay (Spec §1.3).
 *
 * Shown between NewGameModal and the game canvas. Tracks:
 *   Phase 1: fonts loaded
 *   Phase 2: store initialised
 *   Phase 3: first chunk generated
 *   Phase 4: first frame rendered
 *
 * Host component drives `phase` from 0 (idle) to 4 (done).
 * Component calls `onComplete` once phase 4 is reached.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated as RNAnimated, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Logo } from "./Logo.tsx";
import {
  getPhaseLabel,
  getProgressPercent,
  getTip,
  type LoadingPhase,
  tipCount,
} from "./loadingScreenLogic.ts";

// ---------------------------------------------------------------------------
// Color palette (matches the rest of the game UI)
// ---------------------------------------------------------------------------

const C = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
  skyMist: "#E8F5E9",
  trackBg: "#C8E6C9",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadingScreenProps {
  /** Current loading phase (0–4). Host drives this as async steps complete. */
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
        backgroundColor: C.trackBg,
        overflow: "hidden",
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <RNAnimated.View
        style={{
          height: "100%",
          width: animatedWidth,
          borderRadius: 5,
          backgroundColor: C.forestGreen,
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
          color: C.barkBrown,
          textAlign: "center",
          fontSize: 13,
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
      colors={[C.skyMist, `${C.leafLight}40`, `${C.forestGreen}30`]}
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
            color: C.soilDark,
            fontSize: 14,
            fontWeight: "600",
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>

        {/* Progress bar */}
        <ProgressBar percent={percent} reduceMotion={reduceMotion} />

        {/* Percent readout for accessibility */}
        <Text
          style={{
            color: `${C.barkBrown}99`,
            fontSize: 11,
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
