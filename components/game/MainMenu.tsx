import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Dimensions, Animated as RNAnimated, View } from "react-native";
import Svg, { Ellipse, Rect } from "react-native-svg";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FarmerMascot } from "./FarmerMascot.tsx";
import { Logo } from "./Logo.tsx";
import {
  hasSave,
  primaryButtonLabel,
  showNewGroveButton,
  treeSummaryText,
} from "./mainMenuLogic.ts";

/**
 * Game-specific color constants matching the original BabylonJS project.
 */
const C = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
  skyMist: "#E8F5E9",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MainMenuProps {
  treesPlanted: number;
  onContinue: () => void;
  onNewGrove: () => void;
  onSettings: () => void;
}

// ---------------------------------------------------------------------------
// Leaf particle data
// ---------------------------------------------------------------------------

interface LeafConfig {
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  rotation: number;
  duration: number;
  delay: number;
}

const LEAF_CONFIGS: LeafConfig[] = [
  { startX: 0.15, startY: 0.2, dx: 40, dy: 300, rotation: 180, duration: 8000, delay: 0 },
  { startX: 0.45, startY: 0.1, dx: -30, dy: 350, rotation: -120, duration: 10000, delay: 2000 },
  { startX: 0.75, startY: 0.15, dx: 20, dy: 325, rotation: 200, duration: 9000, delay: 4000 },
  { startX: 0.3, startY: 0.05, dx: -50, dy: 400, rotation: -160, duration: 12000, delay: 1000 },
  { startX: 0.85, startY: 0.25, dx: -25, dy: 275, rotation: 140, duration: 7000, delay: 6000 },
];

// ---------------------------------------------------------------------------
// Floating leaf component
// ---------------------------------------------------------------------------

function FloatingLeaf({ config }: { config: LeafConfig }) {
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

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, config.dx],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, config.dy],
  });

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
        color: C.leafLight,
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

function LeftTreeSilhouette() {
  return (
    <View className="absolute bottom-0 left-0" style={{ width: 112, height: 160 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 140" fill="none">
        <Ellipse cx="50" cy="50" rx="40" ry="45" fill={`${C.forestGreen}30`} />
        <Ellipse cx="35" cy="60" rx="30" ry="35" fill={`${C.forestGreen}20`} />
        <Rect x="45" y="90" width="10" height="50" rx="2" fill={`${C.barkBrown}20`} />
      </Svg>
    </View>
  );
}

function RightTreeSilhouette() {
  return (
    <View className="absolute bottom-0 right-0" style={{ width: 96, height: 144 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 140" fill="none">
        <Ellipse cx="50" cy="55" rx="35" ry="40" fill={`${C.forestGreen}25`} />
        <Ellipse cx="60" cy="45" rx="25" ry="30" fill={`${C.forestGreen}18`} />
        <Rect x="46" y="90" width="8" height="50" rx="2" fill={`${C.barkBrown}18`} />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reduced motion hook
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
// Main menu component
// ---------------------------------------------------------------------------

export function MainMenu({ treesPlanted, onContinue, onNewGrove, onSettings }: MainMenuProps) {
  const saveExists = hasSave(treesPlanted);
  const reduceMotion = useReducedMotion();

  // Memoize leaf configs so they don't re-render
  const leaves = useMemo(() => LEAF_CONFIGS, []);

  return (
    <LinearGradient
      colors={[C.skyMist, `${C.leafLight}40`, `${C.forestGreen}30`]}
      locations={[0, 0.5, 1]}
      className="flex-1 items-center justify-center px-4 py-6"
    >
      {/* Background layer: tree silhouettes + floating leaves */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <LeftTreeSilhouette />
        <RightTreeSilhouette />

        {/* Floating leaf particles */}
        {!reduceMotion && leaves.map((leaf, i) => <FloatingLeaf key={`leaf-${i}`} config={leaf} />)}
      </View>

      {/* Card */}
      <View
        className="relative w-full items-center gap-4 rounded-2xl p-4"
        style={{
          maxWidth: 340,
          backgroundColor: "white",
          borderWidth: 3,
          borderColor: `${C.forestGreen}40`,
          // Shadow
          shadowColor: C.forestGreen,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.19,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {/* Subtle gradient overlay on card background */}
        <LinearGradient
          colors={["white", C.skyMist]}
          locations={[0, 1]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 14,
          }}
        />

        {/* Logo */}
        <View className="z-10">
          <Logo size={160} />
        </View>

        {/* Mascot */}
        <View className="z-10 items-center">
          <FarmerMascot size={80} animate={!reduceMotion} />
          {/* Ground shadow */}
          <View
            className="rounded-full"
            style={{
              width: 48,
              height: 8,
              marginTop: -4,
              backgroundColor: `${C.soilDark}30`,
            }}
          />
        </View>

        {/* Tagline */}
        <Text className="z-10 text-center text-sm italic" style={{ color: C.barkBrown }}>
          "Every forest begins with a single seed."
        </Text>

        {/* Buttons */}
        <View className="z-10 w-full gap-2">
          {saveExists && (
            <Button
              className="min-h-[48px] w-full rounded-xl"
              style={{
                backgroundColor: C.forestGreen,
                shadowColor: C.forestGreen,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 4,
              }}
              onPress={onContinue}
            >
              <Text className="text-base font-bold text-white">Continue Grove</Text>
            </Button>
          )}

          <Button
            className={`min-h-[48px] w-full rounded-xl ${saveExists ? "bg-white" : ""}`}
            variant={saveExists ? "outline" : "default"}
            style={
              saveExists
                ? {
                    borderColor: C.forestGreen,
                    borderWidth: 2,
                    backgroundColor: "white",
                  }
                : {
                    backgroundColor: C.forestGreen,
                    shadowColor: C.forestGreen,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 4,
                  }
            }
            onPress={onNewGrove}
          >
            <Text
              className={`text-base font-bold ${saveExists ? "" : "text-white"}`}
              style={saveExists ? { color: C.forestGreen } : undefined}
            >
              {primaryButtonLabel(treesPlanted)}
            </Text>
          </Button>

          {/* Settings — always visible */}
          <Button className="min-h-[44px] w-full rounded-xl" variant="ghost" onPress={onSettings}>
            <Text className="text-sm font-medium" style={{ color: C.barkBrown }}>
              Settings
            </Text>
          </Button>
        </View>

        {/* Stats */}
        {saveExists && (
          <View className="z-10 flex-row items-center gap-2">
            <Text className="text-xs" style={{ color: C.barkBrown }}>
              {treeSummaryText(treesPlanted)}
            </Text>
          </View>
        )}
      </View>

      {/* Version */}
      <Text className="mt-4 text-xs" style={{ color: `${C.forestGreen}80` }}>
        Grovekeeper v0.1.0
      </Text>
    </LinearGradient>
  );
}
