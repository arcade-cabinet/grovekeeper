import React, { useEffect } from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, FONTS, HUD_PANEL, TYPE } from "@/components/ui/tokens";
import { Sparkle } from "./Sparkle.tsx";
import type { AchievementDef, AchievementPopupItem } from "./types.ts";
import { ACHIEVEMENT_CATEGORY, SPARKLE_COUNT } from "./types.ts";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

interface PopupContentProps {
  item: AchievementPopupItem;
  achievementDefs: AchievementDef[];
  onDismiss: () => void;
}

export function PopupContent({ item, achievementDefs, onDismiss }: PopupContentProps) {
  const achievementDef = achievementDefs.find((a) => a.id === item.achievementId);
  const category = ACHIEVEMENT_CATEGORY[item.achievementId] ?? "growth";
  const reduceMotion = useReducedMotion();

  const enterScale = useSharedValue(reduceMotion ? 1 : 0.8);
  const enterOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      enterScale.value = 1;
      enterOpacity.value = 1;
      return;
    }
    enterScale.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    enterOpacity.value = withTiming(1, { duration: 300 });
  }, [enterScale, enterOpacity, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: enterScale.value }],
    opacity: enterOpacity.value,
  }));

  return (
    <View className="flex-1 items-center justify-center bg-black/60 px-6">
      <Pressable
        className="absolute inset-0"
        onPress={onDismiss}
        accessibilityLabel="Close achievement popup"
      />

      <Animated.View
        className="relative w-full max-w-[320px] items-center rounded-2xl p-6 shadow-2xl"
        style={[
          cardStyle,
          {
            ...HUD_PANEL,
            backgroundColor: "rgba(10,12,8,0.95)",
            borderWidth: 3,
            borderColor: ACCENT.gold,
          },
        ]}
      >
        {/* Sparkles */}
        {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
          <Sparkle
            key={`sparkle-${i}`}
            angle={(i / SPARKLE_COUNT) * 2 * Math.PI}
            delay={i * 0.2}
            reduceMotion={reduceMotion}
          />
        ))}

        {/* Category label */}
        <Text
          style={{
            ...TYPE.label,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
            color: DARK.textMuted,
          }}
        >
          {category}
        </Text>

        {/* Title */}
        <Text
          style={{
            ...TYPE.display,
            fontFamily: FONTS.heading,
            textAlign: "center",
            marginBottom: 8,
            color: ACCENT.gold,
          }}
        >
          {achievementDef ? achievementDef.name : item.achievementId}
        </Text>

        {/* Description */}
        {achievementDef && (
          <Text
            style={{
              ...TYPE.body,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 16,
              color: DARK.textSecondary,
            }}
          >
            {achievementDef.description}
          </Text>
        )}

        {/* Claim button */}
        <Button
          className="min-h-[44px] w-full rounded-xl"
          style={{ backgroundColor: ACCENT.amber }}
          onPress={onDismiss}
        >
          <Text style={{ ...TYPE.body, fontWeight: "600", color: DARK.bgDeep }}>Claim</Text>
        </Button>
      </Animated.View>
    </View>
  );
}
