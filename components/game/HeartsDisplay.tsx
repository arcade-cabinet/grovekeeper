/**
 * HeartsDisplay -- row of heart icons showing current player health.
 * Spec S37. Unified doc S3.
 *
 * Count from difficulty tier (3-7). Filled = current, empty = missing.
 * Critical (<2): pulse animation with ember glow.
 * Damage: shake animation when hearts decrease.
 */
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, TYPE } from "@/components/ui/tokens";

export interface HeartsDisplayProps {
  current: number;
  max: number;
}

export function HeartsDisplay({ current, max }: HeartsDisplayProps) {
  const isCritical = current <= 1 && current > 0;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevHearts = useRef(current);

  // Shake on damage
  useEffect(() => {
    if (current < prevHearts.current && current > 0) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    prevHearts.current = current;
  }, [current, shakeAnim]);

  // Pulse when critical
  useEffect(() => {
    if (!isCritical) {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isCritical, pulseAnim]);

  const hearts = [];
  for (let i = 0; i < max; i++) {
    const filled = i < Math.ceil(current);
    const half = filled && i === Math.floor(current) && current % 1 > 0;
    hearts.push(
      <Animated.Text
        key={`heart-${i}`}
        style={{
          ...TYPE.body,
          fontSize: 18,
          opacity: isCritical ? pulseAnim : 1,
          textShadowColor: isCritical ? ACCENT.ember : "transparent",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: isCritical ? 8 : 0,
        }}
      >
        {filled ? (half ? "\u{1F494}" : "\u2764\uFE0F") : "\u{1F5A4}"}
      </Animated.Text>,
    );
  }

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        transform: [{ translateX: shakeAnim }],
      }}
    >
      {hearts}
      <Text style={{ ...TYPE.data, color: ACCENT.ember, marginLeft: 4 }}>
        {Math.ceil(current)}/{max}
      </Text>
    </Animated.View>
  );
}
