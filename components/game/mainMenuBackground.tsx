/**
 * Background decoration components for MainMenu (Spec §26).
 *
 * Extracted from MainMenu.tsx to keep that file under 300 lines.
 * Contains: floating leaf particles, tree silhouettes, useReducedMotion hook.
 */

import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Dimensions, Animated as RNAnimated, View } from "react-native";
import Svg, { Ellipse, Rect } from "react-native-svg";

// ---------------------------------------------------------------------------
// Colors (match MainMenu.tsx C constants)
// ---------------------------------------------------------------------------

const FOREST_GREEN = "#2D5A27";
const BARK_BROWN = "#5D4037";
const LEAF_LIGHT = "#81C784";

// ---------------------------------------------------------------------------
// Leaf particle types + config
// ---------------------------------------------------------------------------

export interface LeafConfig {
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  rotation: number;
  duration: number;
  delay: number;
}

export const LEAF_CONFIGS: LeafConfig[] = [
  { startX: 0.15, startY: 0.2, dx: 40, dy: 300, rotation: 180, duration: 8000, delay: 0 },
  { startX: 0.45, startY: 0.1, dx: -30, dy: 350, rotation: -120, duration: 10000, delay: 2000 },
  { startX: 0.75, startY: 0.15, dx: 20, dy: 325, rotation: 200, duration: 9000, delay: 4000 },
  { startX: 0.3, startY: 0.05, dx: -50, dy: 400, rotation: -160, duration: 12000, delay: 1000 },
  { startX: 0.85, startY: 0.25, dx: -25, dy: 275, rotation: 140, duration: 7000, delay: 6000 },
];

// ---------------------------------------------------------------------------
// FloatingLeaf
// ---------------------------------------------------------------------------

export function FloatingLeaf({ config }: { config: LeafConfig }) {
  const progress = useRef(new RNAnimated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animation = RNAnimated.loop(
        RNAnimated.timing(progress, {
          toValue: 1,
          duration: config.duration,
          useNativeDriver: true,
        }),
      );
      animation.start();
      return () => animation.stop();
    }, config.delay);

    return () => clearTimeout(timeout);
  }, [progress, config.duration, config.delay]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, config.dx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, config.dy] });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${config.rotation}deg`],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.6, 0.4, 0],
  });

  return (
    <RNAnimated.Text
      style={{
        position: "absolute",
        left: screenWidth * config.startX,
        top: screenHeight * config.startY,
        fontSize: 14,
        color: LEAF_LIGHT,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    >
      {"\u{1F343}"}
    </RNAnimated.Text>
  );
}

// ---------------------------------------------------------------------------
// Tree silhouettes
// ---------------------------------------------------------------------------

export function LeftTreeSilhouette() {
  return (
    <View className="absolute bottom-0 left-0" style={{ width: 112, height: 160 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 140" fill="none">
        <Ellipse cx="50" cy="50" rx="40" ry="45" fill={`${FOREST_GREEN}30`} />
        <Ellipse cx="35" cy="60" rx="30" ry="35" fill={`${FOREST_GREEN}20`} />
        <Rect x="45" y="90" width="10" height="50" rx="2" fill={`${BARK_BROWN}20`} />
      </Svg>
    </View>
  );
}

export function RightTreeSilhouette() {
  return (
    <View className="absolute bottom-0 right-0" style={{ width: 96, height: 144 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 140" fill="none">
        <Ellipse cx="50" cy="55" rx="35" ry="40" fill={`${FOREST_GREEN}25`} />
        <Ellipse cx="60" cy="45" rx="25" ry="30" fill={`${FOREST_GREEN}18`} />
        <Rect x="46" y="90" width="8" height="50" rx="2" fill={`${BARK_BROWN}18`} />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// useReducedMotion
// ---------------------------------------------------------------------------

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);

  return reduced;
}
