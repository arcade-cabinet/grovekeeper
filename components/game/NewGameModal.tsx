/**
 * NewGameModal -- survival-only, 4 difficulty tiers, Wind Waker bright.
 *
 * Spec §26, §37. Semi-transparent panel over the 3D world (§0.2).
 * Brand: docs/plans/2026-03-07-ux-brand-design.md §9
 */
import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import { generateSeedPhrase } from "@/game/utils/seedWords";

// ---------------------------------------------------------------------------
// Types — survival-only, no exploration mode
// ---------------------------------------------------------------------------

export type Difficulty = "seedling" | "sapling" | "hardwood" | "ironwood";

/** Config produced by the modal, fed into gameStore.resetGame(). */
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
// Difficulty tiers (unified doc §3)
// ---------------------------------------------------------------------------

interface DifficultyTier {
  id: Difficulty;
  name: string;
  icon: string;
  hearts: number;
  tagline: string;
  color: string;
  permadeathForced: "on" | "off" | "optional";
}

const TIERS: DifficultyTier[] = [
  {
    id: "seedling",
    name: "Seedling",
    icon: "\u{1F331}",
    hearts: 7,
    tagline: "Gentle survival",
    color: ACCENT.sap,
    permadeathForced: "off",
  },
  {
    id: "sapling",
    name: "Sapling",
    icon: "\u{1F33F}",
    hearts: 5,
    tagline: "The intended experience",
    color: ACCENT.frost,
    permadeathForced: "optional",
  },
  {
    id: "hardwood",
    name: "Hardwood",
    icon: "\u{1F525}",
    hearts: 4,
    tagline: "Nature fights back",
    color: ACCENT.amber,
    permadeathForced: "optional",
  },
  {
    id: "ironwood",
    name: "Ironwood",
    icon: "\u{1F480}",
    hearts: 3,
    tagline: "One bad winter ends it all",
    color: ACCENT.ember,
    permadeathForced: "on",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewGameModal({ open, onClose, onStart }: NewGameModalProps) {
  const [seedPhrase, setSeedPhrase] = useState(() => generateSeedPhrase());
  const [difficulty, setDifficulty] = useState<Difficulty>("sapling");
  const [permadeath, setPermadeath] = useState(false);

  const handleShuffle = () => {
    setSeedPhrase(generateSeedPhrase(Date.now()));
  };

  const handleTierSelect = (tier: DifficultyTier) => {
    setDifficulty(tier.id);
    if (tier.permadeathForced === "on") setPermadeath(true);
    else if (tier.permadeathForced === "off") setPermadeath(false);
  };

  const handleStart = () => {
    onStart({ worldSeed: seedPhrase, difficulty, permadeath });
  };

  const activeTier = TIERS.find((t) => t.id === difficulty) ?? TIERS[1];
  const showPermadeath = activeTier.permadeathForced !== "off";

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

            {/* World Seed */}
            <View className="mb-4">
              <Text style={{ ...TYPE.label, color: LIGHT.textMuted, marginBottom: 6 }}>
                WORLD SEED
              </Text>
              <View
                className="flex-row items-center gap-2 rounded-xl px-3 py-2"
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

            {/* Permadeath toggle */}
            {showPermadeath ? (
              <View
                className="mb-4 flex-row items-center justify-between rounded-lg p-3"
                style={{
                  backgroundColor: "rgba(232,245,233,0.7)",
                  borderWidth: 1,
                  borderColor: LIGHT.borderBranch,
                  borderRadius: 8,
                }}
              >
                <View className="mr-3 shrink">
                  <Text style={{ ...TYPE.body, color: LIGHT.textPrimary, fontWeight: "600" }}>
                    Permadeath
                  </Text>
                  <Text style={{ ...TYPE.caption, color: LIGHT.textMuted }}>
                    {activeTier.permadeathForced === "on"
                      ? "Always on for Ironwood"
                      : "Optional \u2014 death is permanent"}
                  </Text>
                </View>
                <Switch
                  value={permadeath}
                  onValueChange={setPermadeath}
                  disabled={activeTier.permadeathForced === "on"}
                  trackColor={{ false: "#CFD8DC", true: ACCENT.sap }}
                  thumbColor="#FAFAFA"
                />
              </View>
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
              <Pressable
                className="min-h-[44px] flex-1 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: ACCENT.sap,
                  shadowColor: ACCENT.sap,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 4,
                }}
                onPress={handleStart}
                accessibilityRole="button"
                accessibilityLabel="Begin Your Grove"
                testID="btn-begin-grove"
              >
                <Text style={{ ...TYPE.heading, color: "#FAFAFA" }}>Begin Your Grove</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// TierCard — 2x2 grid difficulty selection
// ---------------------------------------------------------------------------

function TierCard({
  tier,
  isSelected,
  onSelect,
}: Readonly<{
  tier: DifficultyTier;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  return (
    <Pressable
      className="items-center justify-center rounded-lg p-2"
      style={{
        width: "47%",
        minHeight: 72,
        backgroundColor: isSelected ? `${tier.color}20` : "rgba(255,255,255,0.5)",
        borderWidth: 2,
        borderColor: isSelected ? tier.color : LIGHT.borderBranch,
      }}
      onPress={onSelect}
      accessibilityLabel={`${tier.name}: ${tier.tagline}`}
    >
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
  );
}
