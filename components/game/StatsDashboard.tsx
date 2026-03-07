/**
 * StatsDashboard -- Stats modal showing activity stats and lifetime resources.
 *
 * Reads from the game store to display trees planted, matured, harvested, watered,
 * species grown, level, prestige count, achievements, and lifetime resource totals.
 */
import { XIcon } from "lucide-react-native";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useGameStore } from "@/game/stores/gameStore";

export interface StatsDashboardProps {
  open: boolean;
  onClose: () => void;
}

// Color constants matching the game palette
const FOREST_GREEN = "#2D5A27";
const BARK_BROWN = "#5D4037";
const SOIL_DARK = "#3E2723";
const PARCHMENT = "#F5F0E3";

export function StatsDashboard({ open, onClose }: StatsDashboardProps) {
  const {
    treesPlanted,
    treesHarvested,
    treesWatered,
    treesMatured,
    lifetimeResources,
    achievements,
    prestigeCount,
    level,
    speciesPlanted,
  } = useGameStore();

  const stats = [
    { label: "Trees Planted", value: treesPlanted, icon: "\uD83C\uDF31" },
    { label: "Trees Matured", value: treesMatured, icon: "\uD83C\uDF33" },
    { label: "Trees Harvested", value: treesHarvested, icon: "\uD83E\uDE93" },
    { label: "Trees Watered", value: treesWatered, icon: "\uD83D\uDCA7" },
    { label: "Species Grown", value: speciesPlanted.length, icon: "\uD83C\uDF3F" },
    { label: "Level", value: level, icon: "\u2B50" },
    { label: "Prestige Count", value: prestigeCount, icon: "\u2728" },
    { label: "Achievements", value: `${achievements.length}`, icon: "\uD83C\uDFC6" },
  ];

  const resources = [
    { label: "Timber", value: lifetimeResources.timber ?? 0, icon: "\uD83E\uDEB5" },
    { label: "Sap", value: lifetimeResources.sap ?? 0, icon: "\uD83D\uDCA7" },
    { label: "Fruit", value: lifetimeResources.fruit ?? 0, icon: "\uD83C\uDF4E" },
    { label: "Acorns", value: lifetimeResources.acorns ?? 0, icon: "\uD83C\uDF30" },
  ];

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View
          className="w-full max-w-sm overflow-hidden rounded-2xl"
          style={{
            backgroundColor: PARCHMENT,
            borderWidth: 3,
            borderColor: BARK_BROWN,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ borderBottomColor: `${BARK_BROWN}30` }}>
            <Text className="font-heading text-lg font-bold" style={{ color: SOIL_DARK }}>
              Grove Statistics
            </Text>
            <Pressable
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              onPress={onClose}
              accessibilityLabel="Close statistics"
            >
              <Icon as={XIcon} size={20} className="text-soil-dark" />
            </Pressable>
          </View>

          <ScrollView
            className="max-h-[70vh]"
            contentContainerClassName="p-4"
            showsVerticalScrollIndicator={false}
          >
            {/* Activity section */}
            <View className="mb-4">
              <Text
                className="mb-2 text-sm font-bold"
                style={{ color: FOREST_GREEN }}
              >
                Activity
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {stats.map((s) => (
                  <View
                    key={s.label}
                    className="w-[48%] flex-row items-center gap-2 rounded-lg p-2"
                    style={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                  >
                    <Text className="text-lg">{s.icon}</Text>
                    <View>
                      <Text
                        className="text-xs opacity-60"
                        style={{ color: SOIL_DARK }}
                      >
                        {s.label}
                      </Text>
                      <Text
                        className="text-sm font-bold"
                        style={{ color: SOIL_DARK }}
                      >
                        {s.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Lifetime Resources section */}
            <View>
              <Text
                className="mb-2 text-sm font-bold"
                style={{ color: FOREST_GREEN }}
              >
                Lifetime Resources
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {resources.map((r) => (
                  <View
                    key={r.label}
                    className="w-[48%] flex-row items-center gap-2 rounded-lg p-2"
                    style={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                  >
                    <Text className="text-lg">{r.icon}</Text>
                    <View>
                      <Text
                        className="text-xs opacity-60"
                        style={{ color: SOIL_DARK }}
                      >
                        {r.label}
                      </Text>
                      <Text
                        className="text-sm font-bold"
                        style={{ color: SOIL_DARK }}
                      >
                        {r.value.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
