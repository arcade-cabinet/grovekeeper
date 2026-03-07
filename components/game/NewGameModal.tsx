/**
 * NewGameModal -- game mode + world seed + difficulty selection for a new grove.
 *
 * US-138: Updated for Exploration/Survival mode selection, Adj Adj Noun seed
 * phrases (game/utils/seedWords.ts), shuffle button, and Survival sub-difficulty
 * selector (Gentle/Standard/Harsh/Ironwood). See GAME_SPEC.md §26, §37.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { generateSeedPhrase } from "@/game/utils/seedWords";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameMode = "exploration" | "survival";
export type SurvivalDifficulty = "gentle" | "standard" | "harsh" | "ironwood";

/** Game config produced by the modal and fed into gameStore.resetGame(). */
export interface NewGameConfig {
  worldSeed: string;
  gameMode: GameMode;
  survivalDifficulty: SurvivalDifficulty;
  permadeath: boolean;
}

export interface NewGameModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (config: NewGameConfig) => void;
}

// ---------------------------------------------------------------------------
// Survival tier data (Spec §37.2)
// ---------------------------------------------------------------------------

interface SurvivalTier {
  id: SurvivalDifficulty;
  name: string;
  icon: string;
  hearts: number;
  tagline: string;
  color: string;
  permadeathForced: "on" | "off" | "optional";
}

const SURVIVAL_TIERS: SurvivalTier[] = [
  {
    id: "gentle",
    name: "Gentle",
    icon: "\u{1F331}",
    hearts: 7,
    tagline: "Forgiving survival",
    color: "#4CAF50",
    permadeathForced: "off",
  },
  {
    id: "standard",
    name: "Standard",
    icon: "\u{1F33F}",
    hearts: 5,
    tagline: "The intended experience",
    color: "#2196F3",
    permadeathForced: "optional",
  },
  {
    id: "harsh",
    name: "Harsh",
    icon: "\u{1F525}",
    hearts: 4,
    tagline: "Nature fights back",
    color: "#FF9800",
    permadeathForced: "optional",
  },
  {
    id: "ironwood",
    name: "Ironwood",
    icon: "\u{1F480}",
    hearts: 3,
    tagline: "One bad winter ends it all",
    color: "#F44336",
    permadeathForced: "on",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewGameModal({ open, onClose, onStart }: NewGameModalProps) {
  const [seedPhrase, setSeedPhrase] = useState(() => generateSeedPhrase());
  const [gameMode, setGameMode] = useState<GameMode>("exploration");
  const [survivalDifficulty, setSurvivalDifficulty] = useState<SurvivalDifficulty>("standard");
  const [permadeath, setPermadeath] = useState(false);

  const handleShuffle = () => {
    setSeedPhrase(generateSeedPhrase(Date.now()));
  };

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === "exploration") setPermadeath(false);
  };

  const handleTierSelect = (tier: SurvivalTier) => {
    setSurvivalDifficulty(tier.id);
    if (tier.permadeathForced === "on") setPermadeath(true);
    else if (tier.permadeathForced === "off") setPermadeath(false);
  };

  const handleStart = () => {
    onStart({ worldSeed: seedPhrase, gameMode, survivalDifficulty, permadeath });
  };

  const activeTier = SURVIVAL_TIERS.find((t) => t.id === survivalDifficulty) ?? SURVIVAL_TIERS[1];
  const showPermadeath = gameMode === "survival" && activeTier.permadeathForced !== "off";

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-2xl bg-sky-mist">
          <ScrollView
            className="max-h-[90%]"
            contentContainerClassName="p-5"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Text className="mb-4 text-center font-heading text-lg font-bold text-soil-dark">
              New Grove
            </Text>

            {/* World Seed -- Adj Adj Noun phrase */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                World Seed
              </Text>
              <View className="flex-row items-center gap-2 rounded-xl border-2 border-forest-green/30 bg-white px-3 py-2">
                <TextInput
                  className="flex-1 text-base text-soil-dark"
                  value={seedPhrase}
                  onChangeText={setSeedPhrase}
                  accessibilityLabel="World seed phrase"
                  placeholder="Adjective Adjective Noun"
                />
                <Pressable
                  onPress={handleShuffle}
                  className="min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-forest-green/10"
                  accessibilityLabel="Shuffle seed phrase"
                >
                  <Text className="text-base">{"\u{1F500}"}</Text>
                </Pressable>
              </View>
              <Text className="mt-1 text-center text-[10px] text-gray-400">
                Your world is generated from this phrase
              </Text>
            </View>

            {/* Game Mode selector */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Game Mode
              </Text>
              <View className="flex-row gap-2">
                <ModeButton
                  label="Exploration"
                  icon="\u{1F333}"
                  tagline="Cozy, no survival pressure"
                  isSelected={gameMode === "exploration"}
                  color="#4CAF50"
                  onPress={() => handleModeSelect("exploration")}
                />
                <ModeButton
                  label="Survival"
                  icon="\u2694\uFE0F"
                  tagline="Hearts, hunger, danger"
                  isSelected={gameMode === "survival"}
                  color="#E53935"
                  onPress={() => handleModeSelect("survival")}
                />
              </View>
            </View>

            {/* Survival sub-difficulty (Spec §37.2) */}
            {gameMode === "survival" && (
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Difficulty
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {SURVIVAL_TIERS.map((tier) => (
                    <SubDifficultyTile
                      key={tier.id}
                      tier={tier}
                      isSelected={survivalDifficulty === tier.id}
                      onSelect={() => handleTierSelect(tier)}
                    />
                  ))}
                </View>
                <Text className="mt-2 text-center text-xs text-gray-500">
                  {activeTier.hearts}
                  {"\u2665"} \u00B7 {activeTier.tagline}
                </Text>
              </View>
            )}

            {/* Permadeath toggle (Harsh / Ironwood only) */}
            {showPermadeath && (
              <View className="mb-4 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
                <View className="mr-3 shrink">
                  <Text className="text-sm font-semibold text-soil-dark">Permadeath</Text>
                  <Text className="text-[11px] text-gray-500">
                    {activeTier.permadeathForced === "on"
                      ? "Always on for Ironwood"
                      : "Optional \u2014 death is permanent"}
                  </Text>
                </View>
                <Switch
                  value={permadeath}
                  onValueChange={setPermadeath}
                  disabled={activeTier.permadeathForced === "on"}
                  trackColor={{ false: "#D1D5DB", true: "#2D5A27" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}

            {/* Actions */}
            <View className="flex-row gap-2 pt-1">
              <Button
                className="min-h-[44px] flex-1 rounded-xl border-2 border-bark-brown bg-transparent"
                variant="outline"
                onPress={onClose}
              >
                <Text className="font-bold text-soil-dark">Cancel</Text>
              </Button>
              <View className="flex-1 overflow-hidden rounded-xl">
                <Pressable
                  className="min-h-[44px] items-center justify-center overflow-hidden rounded-xl"
                  onPress={handleStart}
                  accessibilityRole="button"
                  accessibilityLabel="Begin Your Grove"
                >
                  <LinearGradient
                    colors={["#2D5A27", "#4CAF5099"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="absolute inset-0"
                  />
                  <Text className="text-sm font-bold text-white">Begin Your Grove</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModeButton({
  label,
  icon,
  tagline,
  isSelected,
  color,
  onPress,
}: Readonly<{
  label: string;
  icon: string;
  tagline: string;
  isSelected: boolean;
  color: string;
  onPress: () => void;
}>) {
  return (
    <Pressable
      className="flex-1 items-center justify-center rounded-xl p-3"
      style={{
        backgroundColor: isSelected ? `${color}18` : "#FFFFFF",
        borderWidth: 2,
        borderColor: isSelected ? color : "#E0E0E0",
        minHeight: 80,
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} mode`}
    >
      <Text className="mb-0.5 text-2xl">{icon}</Text>
      <Text className="text-sm font-bold" style={{ color: isSelected ? color : "#3E2723" }}>
        {label}
      </Text>
      <Text className="mt-0.5 text-center text-[10px] text-gray-500">{tagline}</Text>
    </Pressable>
  );
}

function SubDifficultyTile({
  tier,
  isSelected,
  onSelect,
}: Readonly<{
  tier: SurvivalTier;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  return (
    <Pressable
      className="items-center justify-center rounded-lg p-2"
      style={{
        width: "47%",
        backgroundColor: isSelected ? `${tier.color}15` : "#FFFFFF",
        borderWidth: 2,
        borderColor: isSelected ? tier.color : "#E0E0E0",
        minHeight: 64,
      }}
      onPress={onSelect}
      accessibilityLabel={`${tier.name}: ${tier.tagline}`}
    >
      <Text className="text-lg">{tier.icon}</Text>
      <Text className="text-xs font-bold" style={{ color: isSelected ? tier.color : "#3E2723" }}>
        {tier.name}
      </Text>
    </Pressable>
  );
}
