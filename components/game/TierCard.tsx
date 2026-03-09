/**
 * TierCard -- difficulty tier selection card with animated pulse border.
 *
 * Extracted from NewGameModal.tsx to keep files under 300 lines.
 * Spec S26, S37.
 */
import { useEffect, useMemo } from "react";
import { Pressable, Animated as RNAnimated } from "react-native";
import { Text } from "@/components/ui/text";
import { LIGHT, TYPE } from "@/components/ui/tokens";
import {
  createTierPulse,
  interpolateTierBorderWidth,
  interpolateTierShadowOpacity,
  startTierPulse,
} from "./mainMenuAnimations.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DifficultyTier {
  id: string;
  name: string;
  icon: string;
  hearts: number;
  tagline: string;
  color: string;
  permadeathForced: "on" | "off" | "optional";
}

export interface TierCardProps {
  tier: DifficultyTier;
  isSelected: boolean;
  onSelect: () => void;
  reduceMotion: boolean;
}

// ---------------------------------------------------------------------------
// TierCard -- 2x2 grid difficulty selection with pulse on selected
// ---------------------------------------------------------------------------

export function TierCard({ tier, isSelected, onSelect, reduceMotion }: TierCardProps) {
  const pulseAnim = useMemo(() => createTierPulse(), []);

  useEffect(() => {
    if (!isSelected || reduceMotion) {
      pulseAnim.setValue(0);
      return;
    }
    const loop = startTierPulse(pulseAnim, reduceMotion);
    loop.start();
    return () => loop.stop();
  }, [isSelected, pulseAnim, reduceMotion]);

  const borderWidth = isSelected ? interpolateTierBorderWidth(pulseAnim) : 2;
  const shadowOpacity = isSelected ? interpolateTierShadowOpacity(pulseAnim) : 0;

  return (
    <RNAnimated.View
      style={{
        width: "47%",
        shadowColor: tier.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? shadowOpacity : 0,
        shadowRadius: 8,
        elevation: isSelected ? 3 : 0,
      }}
    >
      <Pressable
        className="items-center justify-center rounded-lg p-2"
        style={{
          minHeight: 72,
          backgroundColor: isSelected ? `${tier.color}20` : "rgba(255,255,255,0.5)",
        }}
        onPress={onSelect}
        accessibilityLabel={`${tier.name}: ${tier.tagline}`}
      >
        <RNAnimated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 8,
            borderWidth: isSelected ? borderWidth : 2,
            borderColor: isSelected ? tier.color : LIGHT.borderBranch,
          }}
        />
        <Text className="text-lg">{tier.icon}</Text>
        <Text
          style={{
            ...TYPE.label,
            color: isSelected ? tier.color : LIGHT.textSecondary,
            fontWeight: "700",
          }}
        >
          {tier.name}
        </Text>
        <Text style={{ ...TYPE.caption, color: LIGHT.textMuted }}>
          {tier.hearts}
          {"\u2665"}
        </Text>
      </Pressable>
    </RNAnimated.View>
  );
}
