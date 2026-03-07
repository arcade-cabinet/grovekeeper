/**
 * NewGameModal -- Difficulty selection UI for starting a new grove.
 *
 * Mobile-first layout: 3 tiles top row (Explore/Normal/Hard),
 * 2 tiles bottom row (Brutal/Ultra Brutal). Shows description panel
 * and permadeath toggle based on selected difficulty.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export interface DifficultyTier {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  permadeathForced: "on" | "off" | "optional";
  growthSpeedMult: number;
  resourceYieldMult: number;
  exposureEnabled: boolean;
  disasterFrequency: number;
  buildingDegradationRate: number;
  cropDiseaseEnabled: boolean;
}

export interface NewGameModalProps {
  open: boolean;
  difficultyTiers: DifficultyTier[];
  onClose: () => void;
  onStart: (difficulty: string, permadeath: boolean) => void;
}

const ICONS: Record<string, string> = {
  leaf: "\u{1F33F}",
  sun: "\u2600\uFE0F",
  flame: "\u{1F525}",
  skull: "\u{1F480}",
  zap: "\u26A1",
};

export function NewGameModal({ open, difficultyTiers, onClose, onStart }: NewGameModalProps) {
  const [selected, setSelected] = useState<DifficultyTier>(
    difficultyTiers.find((t) => t.id === "normal") ?? difficultyTiers[0],
  );
  const [permadeath, setPermadeath] = useState(false);

  const handleSelect = (tier: DifficultyTier) => {
    setSelected(tier);
    // Reset permadeath based on forced state
    if (tier.permadeathForced === "on") setPermadeath(true);
    else setPermadeath(false);
  };

  const handleStart = () => {
    onStart(selected.id, permadeath);
  };

  // Split tiers into rows: top 3, bottom 2
  const topRow = difficultyTiers.slice(0, 3);
  const bottomRow = difficultyTiers.slice(3);

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
            <Text className="mb-3 text-center font-heading text-lg font-bold text-soil-dark">
              Choose Your Challenge
            </Text>

            {/* Top row: Explore, Normal, Hard */}
            <View className="mb-2 flex-row gap-2">
              {topRow.map((tier) => (
                <DifficultyTile
                  key={tier.id}
                  tier={tier}
                  isSelected={selected.id === tier.id}
                  onSelect={() => handleSelect(tier)}
                />
              ))}
            </View>

            {/* Bottom row: Brutal, Ultra Brutal */}
            <View className="mb-3 flex-row gap-2">
              {bottomRow.map((tier) => (
                <DifficultyTile
                  key={tier.id}
                  tier={tier}
                  isSelected={selected.id === tier.id}
                  onSelect={() => handleSelect(tier)}
                />
              ))}
            </View>

            {/* Description panel */}
            <View
              className="mb-3 rounded-lg bg-white p-3"
              style={{ borderWidth: 2, borderColor: `${selected.color}40` }}
            >
              <View className="mb-1 flex-row items-center gap-2">
                <Text className="text-lg">{ICONS[selected.icon] ?? ""}</Text>
                <Text className="text-base font-bold" style={{ color: selected.color }}>
                  {selected.name}
                </Text>
              </View>
              <Text className="text-xs leading-5 text-gray-600">{selected.description}</Text>

              {/* Feature summary */}
              <View className="mt-2 flex-row flex-wrap">
                <View className="w-1/2 pr-1.5">
                  <FeatureRow label="Growth" value={`${selected.growthSpeedMult}x`} />
                </View>
                <View className="w-1/2 pl-1.5">
                  <FeatureRow label="Yields" value={`${selected.resourceYieldMult}x`} />
                </View>
                <View className="w-1/2 pr-1.5">
                  <FeatureRow
                    label="Exposure"
                    value={selected.exposureEnabled ? "Active" : "Off"}
                  />
                </View>
                <View className="w-1/2 pl-1.5">
                  <FeatureRow
                    label="Disasters"
                    value={
                      selected.disasterFrequency > 0
                        ? `${selected.disasterFrequency}/yr`
                        : "None"
                    }
                  />
                </View>
                <View className="w-1/2 pr-1.5">
                  <FeatureRow
                    label="Building Decay"
                    value={
                      selected.buildingDegradationRate > 0
                        ? `${selected.buildingDegradationRate}%/season`
                        : "None"
                    }
                  />
                </View>
                <View className="w-1/2 pl-1.5">
                  <FeatureRow
                    label="Diseases"
                    value={selected.cropDiseaseEnabled ? "Active" : "None"}
                  />
                </View>
              </View>
            </View>

            {/* Permadeath toggle */}
            <View className="mb-3 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
              <View className="mr-3 shrink">
                <Text className="text-sm font-semibold text-soil-dark">Permadeath</Text>
                <Text className="text-[11px] text-gray-500">
                  {permadeathLabel(selected.permadeathForced)}
                </Text>
              </View>
              <Switch
                value={permadeath}
                onValueChange={setPermadeath}
                disabled={selected.permadeathForced !== "optional"}
                trackColor={{ false: "#D1D5DB", true: "#2D5A27" }}
                thumbColor="#FFFFFF"
              />
            </View>

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
                    colors={[selected.color, `${selected.color}dd`]}
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

// --- Helpers ---

function permadeathLabel(forced: string): string {
  if (forced === "on") return "Always on for this difficulty";
  if (forced === "off") return "Disabled for this difficulty";
  return "Optional -- death is permanent";
}

// --- Sub-components ---

function DifficultyTile({
  tier,
  isSelected,
  onSelect,
}: Readonly<{
  tier: DifficultyTier;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const isRecommended = tier.id === "normal";

  return (
    <Pressable
      accessibilityLabel={`${tier.name} difficulty${isRecommended ? " (Recommended)" : ""}: ${tier.tagline}`}
      className="relative min-h-[72px] flex-1 items-center justify-center rounded-lg p-2"
      style={{
        backgroundColor: isSelected ? `${tier.color}15` : "#FFFFFF",
        borderWidth: 2,
        borderColor: isSelected ? tier.color : "#E0E0E0",
        shadowColor: isSelected ? tier.color : "transparent",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? 0.3 : 0,
        shadowRadius: 4,
        elevation: isSelected ? 4 : 0,
      }}
      onPress={onSelect}
    >
      {isRecommended && (
        <View
          className="absolute -top-2 self-center rounded-full px-1.5 py-0.5"
          style={{ backgroundColor: tier.color }}
        >
          <Text className="text-[9px] font-bold text-white">Recommended</Text>
        </View>
      )}
      <Text className="mb-0.5 text-xl">{ICONS[tier.icon] ?? ""}</Text>
      <Text
        className="text-xs font-bold"
        style={{ color: isSelected ? tier.color : "#3E2723" }}
      >
        {tier.name}
      </Text>
    </Pressable>
  );
}

function FeatureRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-[11px] text-gray-500">{label}</Text>
      <Text className="text-[11px] font-medium text-gray-700">{value}</Text>
    </View>
  );
}
