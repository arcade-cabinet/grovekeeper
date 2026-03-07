/**
 * SeedSelect -- Species picker dialog for selecting which seed to plant.
 *
 * Restores all features from the original BabylonJS web version:
 * - 2-column grid layout of species cards
 * - SVG tree preview with trunk + canopy using species mesh colors
 * - Seed count badge (top-right, green when available, red when empty)
 * - Difficulty stars with color coding
 * - Unlock level display
 * - Seed cost display (or "Free" label)
 * - Special trait text
 * - Lock icon for unowned species
 * - Selection highlight ring
 */

import { LockIcon, XIcon } from "lucide-react-native";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Ellipse, Rect } from "react-native-svg";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeedSelectSpecies {
  id: string;
  name: string;
  difficulty: number;
  unlockLevel: number;
  biome: string;
  special: string;
  seedCost: Record<string, number>;
  trunkColor: string;
  canopyColor: string;
}

export interface SeedSelectProps {
  open: boolean;
  species: SeedSelectSpecies[];
  unlockedSpecies: string[];
  seeds: Record<string, number>;
  selectedSpecies: string;
  onSelect: (speciesId: string) => void;
  onClose: () => void;
  /** Active world seed phrase (Adj Adj Noun). Shown as a header badge when provided. */
  worldSeed?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "#81C784", // leafLight
  2: "#81C784",
  3: "#FFB74D", // autumnGold
  4: "#FFAB91", // sunsetWarm
  5: "#8D6E63", // earthRed
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSeedCost(cost: Record<string, number>): string | null {
  const entries = Object.entries(cost).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return null;
  return entries
    .map(
      ([resource, amount]) =>
        `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
    )
    .join(", ");
}

// ---------------------------------------------------------------------------
// Tree preview SVG
// ---------------------------------------------------------------------------

function TreePreview({
  trunkColor,
  canopyColor,
}: {
  trunkColor: string;
  canopyColor: string;
}) {
  return (
    <Svg width={36} height={48} viewBox="0 0 36 48" fill="none">
      {/* Trunk */}
      <Rect x={15} y={28} width={6} height={16} rx={1.5} fill={trunkColor} />
      {/* Canopy layers */}
      <Ellipse cx={18} cy={22} rx={14} ry={12} fill={canopyColor} />
      <Ellipse
        cx={18}
        cy={16}
        rx={10}
        ry={10}
        fill={canopyColor}
        opacity={0.7}
      />
      {/* Highlight */}
      <Ellipse cx={14} cy={16} rx={4} ry={3} fill="white" opacity={0.15} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeedSelect({
  open,
  species,
  unlockedSpecies,
  seeds,
  selectedSpecies,
  onSelect,
  onClose,
  worldSeed,
}: SeedSelectProps) {
  if (!open) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        {/* Backdrop tap to close */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Close seed selector"
        />

        <View className="max-h-[80%] rounded-t-2xl border-t-2 border-forest-green/40 bg-sky-mist pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-bark-brown/20 px-4 py-3">
            <Text className="font-heading text-lg font-bold text-soil-dark">
              Select a Seed
            </Text>
            <Pressable
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Icon as={XIcon} size={20} className="text-soil-dark" />
            </Pressable>
          </View>

          {/* World seed badge -- Adj Adj Noun phrase (Spec §3.1) */}
          {worldSeed ? (
            <View className="mx-4 mb-2 mt-1 rounded-lg bg-forest-green/10 px-3 py-1.5">
              <Text className="text-center text-[11px] text-forest-green">
                {"\u{1F331}"} World: {worldSeed}
              </Text>
            </View>
          ) : null}

          {/* Species grid - 2 columns */}
          <ScrollView className="px-3 py-3">
            <View className="flex-row flex-wrap gap-3">
              {species.map((sp) => {
                const isUnlocked = unlockedSpecies.includes(sp.id);
                const isSelected = selectedSpecies === sp.id;
                const seedCount = seeds[sp.id] ?? 0;
                const hasSeeds = seedCount > 0;
                const isDisabled = !isUnlocked || !hasSeeds;
                const costStr = formatSeedCost(sp.seedCost);

                return (
                  <Pressable
                    key={sp.id}
                    className={`rounded-xl border-2 p-3 ${
                      isSelected
                        ? "border-forest-green bg-leaf-light/20"
                        : "border-transparent bg-white"
                    } ${isDisabled ? "opacity-50" : ""}`}
                    style={{ width: "47%" }}
                    disabled={isDisabled}
                    onPress={() => {
                      onSelect(sp.id);
                      onClose();
                    }}
                    accessibilityLabel={`${sp.name}${isUnlocked ? `, ${seedCount} seeds` : ", locked"}`}
                  >
                    {/* Tree preview area */}
                    <View
                      className="relative mb-2 h-16 w-full items-end justify-center rounded"
                      style={{ backgroundColor: "rgba(62,39,35,0.12)" }}
                    >
                      {isUnlocked ? (
                        <View className="mb-1 items-center">
                          <TreePreview
                            trunkColor={sp.trunkColor}
                            canopyColor={sp.canopyColor}
                          />
                        </View>
                      ) : (
                        <View className="mb-2 items-center self-center">
                          <Icon
                            as={LockIcon}
                            size={32}
                            className="text-gray-400"
                          />
                        </View>
                      )}

                      {/* Seed count badge - top right */}
                      {isUnlocked && (
                        <View
                          className="absolute right-1 top-1 rounded-full px-1.5 py-0.5"
                          style={{
                            backgroundColor: hasSeeds
                              ? "#2D5A27"
                              : "#8D6E63",
                            minWidth: 20,
                          }}
                        >
                          <Text className="text-center text-[10px] font-bold text-white">
                            x{seedCount}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Species name */}
                    <Text className="text-sm font-bold text-soil-dark">
                      {sp.name}
                    </Text>

                    {/* Difficulty + unlock level */}
                    <View className="mt-1 flex-row items-center gap-2">
                      <View
                        className="rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor:
                            DIFFICULTY_COLORS[sp.difficulty] ?? "#9E9E9E",
                        }}
                      >
                        <Text
                          className="text-xs"
                          style={{
                            color:
                              sp.difficulty <= 2 ? "#3E2723" : "white",
                          }}
                        >
                          {"*".repeat(sp.difficulty)}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500">
                        Lv.{sp.unlockLevel}
                      </Text>
                    </View>

                    {/* Seed cost */}
                    {isUnlocked && costStr && (
                      <Text className="mt-1 text-[10px] text-red-400">
                        Cost: {costStr}
                      </Text>
                    )}
                    {isUnlocked && !costStr && (
                      <Text className="mt-1 text-[10px] text-leaf-light">
                        Free
                      </Text>
                    )}

                    {/* Special trait */}
                    {isUnlocked && (
                      <Text
                        className="mt-1 text-xs text-gray-500"
                        numberOfLines={2}
                      >
                        {sp.special}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Cancel button */}
          <View className="px-4 pt-2">
            <Pressable
              className="min-h-[44px] items-center justify-center rounded-xl border-2 border-forest-green"
              onPress={onClose}
              accessibilityLabel="Cancel seed selection"
            >
              <Text className="font-bold text-forest-green">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
