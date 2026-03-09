/**
 * NewGameModal -- survival-only, 4 difficulty tiers, Wind Waker bright.
 *
 * Spec S26, S37. Semi-transparent panel over the 3D world (S0.2).
 * Brand: docs/plans/2026-03-07-ux-brand-design.md S9
 */
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import { generateSeedPhrase } from "@/game/utils/seedWords";
import { TIERS } from "./difficultyTiers.ts";
import {
  animateButtonPressIn,
  animateButtonPressOut,
  createButtonScale,
  createEmberPulse,
  createGlowPulse,
  interpolateEmberBackground,
  interpolateGlowRadius,
  startEmberPulse,
} from "./mainMenuAnimations.ts";
import { useReducedMotion } from "./mainMenuBackground.tsx";
import { type DifficultyTier, TierCard } from "./TierCard.tsx";

// ---------------------------------------------------------------------------
// Types -- survival-only, no exploration mode
// ---------------------------------------------------------------------------

export type Difficulty = "seedling" | "sapling" | "hardwood" | "ironwood";

export interface NewGameConfig {
  worldSeed: string;
  difficulty: Difficulty;
  permadeath: boolean;
}

export interface NewGameModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (config: NewGameConfig) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewGameModal({ open, onClose, onStart }: NewGameModalProps) {
  const [seedPhrase, setSeedPhrase] = useState(() => generateSeedPhrase());
  const [difficulty, setDifficulty] = useState<Difficulty>("sapling");
  const [permadeath, setPermadeath] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleShuffle = () => setSeedPhrase(generateSeedPhrase(Date.now()));

  const handleTierSelect = (tier: DifficultyTier) => {
    setDifficulty(tier.id as Difficulty);
    if (tier.permadeathForced === "on") setPermadeath(true);
    else if (tier.permadeathForced === "off") setPermadeath(false);
  };

  const handleStart = () => onStart({ worldSeed: seedPhrase, difficulty, permadeath });

  const activeTier = TIERS.find((t) => t.id === difficulty) ?? TIERS[1];
  const showPermadeath = activeTier.permadeathForced !== "off";

  // Begin button glow + press animation
  const beginGlow = useMemo(() => createGlowPulse(reduceMotion), [reduceMotion]);
  const { scale: beginScale } = useMemo(() => createButtonScale(), []);
  useEffect(() => {
    if (reduceMotion || !open) return;
    beginGlow.loop.start();
    return () => beginGlow.loop.stop();
  }, [beginGlow, reduceMotion, open]);

  // Ember pulse for permadeath
  const emberAnim = useMemo(() => createEmberPulse(), []);
  useEffect(() => {
    if (reduceMotion || !showPermadeath) return;
    const loop = startEmberPulse(emberAnim, reduceMotion);
    loop.start();
    return () => loop.stop();
  }, [emberAnim, reduceMotion, showPermadeath]);

  const emberBg = interpolateEmberBackground(emberAnim);
  const beginGlowRadius = interpolateGlowRadius(beginGlow.anim);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      >
        <View
          className="w-full max-w-sm rounded-2xl"
          style={{
            backgroundColor: "rgba(255,255,255,0.88)",
            borderWidth: 2,
            borderColor: LIGHT.borderBranch,
          }}
        >
          <ScrollView
            className="max-h-[90%]"
            contentContainerClassName="p-5"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Text
              className="mb-4 text-center"
              style={{ ...TYPE.display, fontFamily: FONTS.heading, color: LIGHT.textPrimary }}
            >
              New Grove
            </Text>

            {/* World Seed with decorative frame */}
            <View className="mb-4">
              <Text style={{ ...TYPE.label, color: LIGHT.textMuted, marginBottom: 6 }}>
                {"\u{1F33F}"} WORLD SEED
              </Text>
              <View
                style={{
                  borderWidth: 2,
                  borderColor: ACCENT.sap,
                  borderRadius: 12,
                  padding: 2,
                  backgroundColor: `${ACCENT.sap}08`,
                }}
              >
                <View
                  className="flex-row items-center gap-2 rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: "rgba(232,245,233,0.7)",
                    borderWidth: 1,
                    borderColor: LIGHT.borderBranch,
                    borderRadius: 8,
                  }}
                >
                  <TextInput
                    className="flex-1 text-base"
                    style={{ color: LIGHT.textPrimary, fontFamily: FONTS.body }}
                    value={seedPhrase}
                    onChangeText={setSeedPhrase}
                    accessibilityLabel="World seed phrase"
                    placeholder="Adjective Adjective Noun"
                    placeholderTextColor={LIGHT.textMuted}
                  />
                  <Pressable
                    onPress={handleShuffle}
                    className="min-h-[36px] min-w-[36px] items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${ACCENT.sap}20` }}
                    accessibilityLabel="Shuffle seed phrase"
                  >
                    <Text className="text-base">{"\u{1F500}"}</Text>
                  </Pressable>
                </View>
              </View>
              <Text
                className="mt-1 text-center"
                style={{ ...TYPE.caption, color: LIGHT.textMuted }}
              >
                Your world is generated from this phrase
              </Text>
            </View>

            {/* Difficulty: 2x2 Grid */}
            <View className="mb-4">
              <Text style={{ ...TYPE.label, color: LIGHT.textMuted, marginBottom: 6 }}>
                DIFFICULTY
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {TIERS.map((tier) => (
                  <TierCard
                    key={tier.id}
                    tier={tier}
                    isSelected={difficulty === tier.id}
                    onSelect={() => handleTierSelect(tier)}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </View>
              <Text
                className="mt-2 text-center"
                style={{ ...TYPE.caption, color: LIGHT.textSecondary }}
              >
                {activeTier.hearts}
                {"\u2665"} {"\u00B7"} {activeTier.tagline}
              </Text>
            </View>

            {/* Permadeath toggle -- ember styling */}
            {showPermadeath ? (
              <RNAnimated.View
                className="mb-4 flex-row items-center justify-between rounded-lg p-3"
                style={{
                  backgroundColor: permadeath ? emberBg : "rgba(232,245,233,0.7)",
                  borderWidth: 1,
                  borderColor: permadeath ? ACCENT.ember : LIGHT.borderBranch,
                  borderRadius: 8,
                }}
              >
                <View className="mr-3 shrink">
                  <View className="flex-row items-center gap-1">
                    {permadeath && <Text style={{ fontSize: 14 }}>{"\u{26A0}\uFE0F"}</Text>}
                    <Text
                      style={{
                        ...TYPE.body,
                        color: permadeath ? ACCENT.ember : LIGHT.textPrimary,
                        fontWeight: "700",
                      }}
                    >
                      Permadeath
                    </Text>
                  </View>
                  <Text
                    style={{
                      ...TYPE.caption,
                      color: permadeath ? ACCENT.ember : LIGHT.textMuted,
                    }}
                  >
                    {activeTier.permadeathForced === "on"
                      ? "Always on for Ironwood"
                      : "Optional \u2014 death is permanent"}
                  </Text>
                </View>
                <Switch
                  value={permadeath}
                  onValueChange={setPermadeath}
                  disabled={activeTier.permadeathForced === "on"}
                  trackColor={{ false: "#CFD8DC", true: ACCENT.ember }}
                  thumbColor="#FAFAFA"
                />
              </RNAnimated.View>
            ) : null}

            {/* Actions */}
            <View className="flex-row gap-2 pt-1">
              <Button
                className="min-h-[44px] flex-1 rounded-xl"
                variant="outline"
                style={{
                  borderColor: LIGHT.borderBranch,
                  borderWidth: 2,
                  backgroundColor: "rgba(255,255,255,0.5)",
                }}
                onPress={onClose}
              >
                <Text style={{ ...TYPE.body, color: LIGHT.textPrimary, fontWeight: "700" }}>
                  Cancel
                </Text>
              </Button>
              <RNAnimated.View style={{ flex: 1, transform: [{ scale: beginScale }] }}>
                <Pressable
                  className="min-h-[44px] flex-1 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: ACCENT.sap,
                    shadowColor: ACCENT.gold,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                  onPress={handleStart}
                  onPressIn={() => animateButtonPressIn(beginScale)}
                  onPressOut={() => animateButtonPressOut(beginScale)}
                  accessibilityRole="button"
                  accessibilityLabel="Begin Your Grove"
                  testID="btn-begin-grove"
                >
                  <RNAnimated.Text
                    style={{
                      ...TYPE.heading,
                      color: "#FAFAFA",
                      textShadowColor: ACCENT.gold,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: beginGlowRadius,
                    }}
                  >
                    Begin Your Grove
                  </RNAnimated.Text>
                </Pressable>
              </RNAnimated.View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
