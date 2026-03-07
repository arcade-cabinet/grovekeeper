/**
 * RulesModal -- Tutorial steps carousel with 8 slides, progress dots,
 * and navigation buttons. Minimum 44px touch targets throughout.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

const STEPS = [
  {
    icon: "\uD83C\uDF31",
    title: "Plant Trees",
    description:
      "Select the trowel, stand on an empty soil tile, and tap the action button to plant. Each species needs seeds -- some require resources too.",
  },
  {
    icon: "\uD83D\uDCA7",
    title: "Water & Care",
    description:
      "Switch to the watering can and tap near growing trees. Watered trees grow 30% faster and produce better yields at harvest.",
  },
  {
    icon: "\uD83E\uDE93",
    title: "Harvest",
    description:
      "Mature trees can be harvested with the axe for Timber, Sap, Fruit, or Acorns depending on the species. Pruning first gives 1.5x yield!",
  },
  {
    icon: "\uD83D\uDD0B",
    title: "Stamina",
    description:
      "Every tool action costs stamina. When you run low, rest and it regenerates over time. Plan your actions wisely!",
  },
  {
    icon: "\uD83E\uDEB5",
    title: "Resources & Seeds",
    description:
      "Harvest trees to collect resources. Some species cost resources to plant. Trade surplus at the seasonal market for what you need.",
  },
  {
    icon: "\u23F0",
    title: "Seasons & Weather",
    description:
      "Spring boosts growth, winter halts it. Rain helps, drought hurts, windstorms can damage young trees. Evergreens grow in winter!",
  },
  {
    icon: "\uD83D\uDCC8",
    title: "Level Up & Explore",
    description:
      "Earn XP from everything you do. Level up to unlock new species, tools, grid expansions, and new zones to explore.",
  },
  {
    icon: "\uD83D\uDC46",
    title: "Controls",
    description:
      "Tap to walk anywhere. Use the joystick (mobile) or WASD (desktop) to move. Tap objects to interact. The action button uses your current tool.",
  },
];

// Color constants matching the game palette
const FOREST_GREEN = "#2D5A27";
const BARK_BROWN = "#5D4037";
const SOIL_DARK = "#3E2723";
const SKY_MIST = "#E8F5E9";

export function RulesModal({ open, onClose, onStart }: RulesModalProps) {
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(0);
      onStart();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View
          className="w-full max-w-sm overflow-hidden rounded-2xl"
          style={{
            borderWidth: 3,
            borderColor: `${FOREST_GREEN}40`,
          }}
        >
          {/* Background gradient */}
          <LinearGradient colors={["#faf9f6", SKY_MIST]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}>
            {/* Header */}
            <View className="items-center px-5 pb-3 pt-5">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl">{"\uD83C\uDF32"}</Text>
                <Text
                  className="font-heading text-xl font-bold"
                  style={{ color: FOREST_GREEN }}
                >
                  How to Play
                </Text>
                <Text className="text-xl">{"\uD83C\uDF32"}</Text>
              </View>
              <Text className="mt-1 text-xs" style={{ color: BARK_BROWN }}>
                Step {step + 1} of {STEPS.length}
              </Text>
            </View>

            {/* Progress dots */}
            <View className="flex-row items-center justify-center gap-1.5 px-5 pb-3">
              {STEPS.map((s, i) => {
                let dotColor = `${FOREST_GREEN}20`;
                if (i === step) dotColor = FOREST_GREEN;
                else if (i < step) dotColor = `${FOREST_GREEN}60`;
                return (
                  <Pressable
                    key={s.title}
                    className="min-h-[44px] min-w-[44px] items-center justify-center"
                    onPress={() => setStep(i)}
                    accessibilityLabel={`Go to step ${i + 1}`}
                  >
                    <View
                      className="rounded-full"
                      style={{
                        width: i === step ? 10.4 : 8,
                        height: i === step ? 10.4 : 8,
                        backgroundColor: dotColor,
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Current step content */}
            <View className="px-5 pb-4">
              <View
                className="items-center gap-3 rounded-xl p-5"
                style={{
                  backgroundColor: "rgba(255,255,255,0.7)",
                  borderWidth: 1,
                  borderColor: `${FOREST_GREEN}20`,
                }}
              >
                <Text className="text-5xl">{current.icon}</Text>
                <Text
                  className="text-center font-heading text-lg font-bold"
                  style={{ color: SOIL_DARK }}
                >
                  {current.title}
                </Text>
                <Text
                  className="text-center text-sm leading-5"
                  style={{ color: BARK_BROWN }}
                >
                  {current.description}
                </Text>
              </View>
            </View>

            {/* Navigation buttons */}
            <View className="flex-row gap-2 px-4 pb-4">
              {step > 0 ? (
                <Button
                  className="min-h-[44px] flex-1 rounded-xl"
                  variant="outline"
                  style={{
                    borderColor: FOREST_GREEN,
                    borderWidth: 2,
                  }}
                  onPress={handleBack}
                >
                  <Text className="font-semibold" style={{ color: FOREST_GREEN }}>
                    Back
                  </Text>
                </Button>
              ) : (
                <Button
                  className="min-h-[44px] flex-1 rounded-xl"
                  variant="outline"
                  style={{
                    borderColor: `${BARK_BROWN}80`,
                    borderWidth: 1,
                  }}
                  onPress={onStart}
                >
                  <Text className="font-semibold" style={{ color: BARK_BROWN }}>
                    Skip
                  </Text>
                </Button>
              )}
              <View className="flex-1 overflow-hidden rounded-xl">
                <Pressable
                  className="min-h-[44px] items-center justify-center overflow-hidden rounded-xl"
                  onPress={handleNext}
                  accessibilityRole="button"
                  accessibilityLabel={isLast ? "Let's Grow!" : "Next"}
                >
                  <LinearGradient
                    colors={[FOREST_GREEN, `${FOREST_GREEN}dd`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="absolute inset-0"
                  />
                  <Text className="text-sm font-semibold text-white">
                    {isLast ? "Let's Grow!" : "Next"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
