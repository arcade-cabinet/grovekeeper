import { useEffect } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export interface AchievementPopupItem {
  id: string;
  achievementId: string;
  createdAt: number;
}

interface AchievementPopupStore {
  popup: AchievementPopupItem | null;
  showAchievement: (achievementId: string) => void;
  clearPopup: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000;
const SPARKLE_COUNT = 8;

// Category-based emoji text (no actual emoji -- using text symbols for RN)
const ACHIEVEMENT_CATEGORY: Record<string, string> = {
  "first-seed": "planting",
  "seed-spreader": "planting",
  "forest-founder": "planting",
  "one-of-each": "diversity",
  "patient-gardener": "growth",
  "old-growth-guardian": "growth",
  "timber-baron": "resource",
  "sap-collector": "resource",
  "the-giving-tree": "resource",
  "canopy-complete": "grid",
  "full-grove": "grid",
  biodiversity: "diversity",
  "seasonal-veteran": "seasonal",
  "enchanted-grove": "growth",
  "new-beginnings": "prestige",
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let popupCounter = 0;

export const useAchievementPopupStore = create<AchievementPopupStore>(
  (set, get) => ({
    popup: null,

    showAchievement: (achievementId: string) => {
      popupCounter += 1;
      const id = `achievement-popup-${Date.now()}-${popupCounter}`;
      const item: AchievementPopupItem = {
        id,
        achievementId,
        createdAt: Date.now(),
      };

      set({ popup: item });

      setTimeout(() => {
        const current = get().popup;
        if (current && current.id === id) {
          get().clearPopup();
        }
      }, AUTO_DISMISS_MS);
    },

    clearPopup: () => {
      set({ popup: null });
    },
  }),
);

export function showAchievement(achievementId: string) {
  useAchievementPopupStore.getState().showAchievement(achievementId);
}

// ---------------------------------------------------------------------------
// Sparkle component (animated dot)
// ---------------------------------------------------------------------------

function Sparkle({ angle, delay }: { angle: number; delay: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(
      delay * 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
    scale.value = withDelay(
      delay * 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.5, { duration: 500 }),
        ),
        -1,
        true,
      ),
    );
  }, [opacity, scale, delay]);

  const radius = 80;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      className="absolute h-2 w-2 rounded-full bg-prestige-gold"
      style={[
        {
          left: "50%",
          top: "50%",
          marginLeft: x - 4,
          marginTop: y - 4,
        },
        animatedStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Popup content
// ---------------------------------------------------------------------------

interface PopupContentProps {
  item: AchievementPopupItem;
  achievementDefs: AchievementDef[];
  onDismiss: () => void;
}

function PopupContent({ item, achievementDefs, onDismiss }: PopupContentProps) {
  const achievementDef = achievementDefs.find(
    (a) => a.id === item.achievementId,
  );
  const category = ACHIEVEMENT_CATEGORY[item.achievementId] ?? "growth";

  const enterScale = useSharedValue(0.8);
  const enterOpacity = useSharedValue(0);

  useEffect(() => {
    enterScale.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    enterOpacity.value = withTiming(1, { duration: 300 });
  }, [enterScale, enterOpacity]);

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
        className="relative w-full max-w-[320px] items-center rounded-2xl border-[3px] border-prestige-gold bg-sky-mist p-6 shadow-2xl"
        style={cardStyle}
      >
        {/* Sparkles */}
        {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
          <Sparkle
            key={`sparkle-${i}`}
            angle={(i / SPARKLE_COUNT) * 2 * Math.PI}
            delay={i * 0.2}
          />
        ))}

        {/* Category label */}
        <Text className="mb-2 text-xs font-medium uppercase tracking-wider text-forest-green">
          {category}
        </Text>

        {/* Title */}
        <Text className="mb-2 text-center font-heading text-2xl font-bold text-soil-dark">
          {achievementDef ? achievementDef.name : item.achievementId}
        </Text>

        {/* Description */}
        {achievementDef && (
          <Text className="mb-4 text-center text-sm leading-5 text-forest-green">
            {achievementDef.description}
          </Text>
        )}

        {/* Claim button */}
        <Button
          className="min-h-[44px] w-full rounded-xl bg-autumn-gold"
          onPress={onDismiss}
        >
          <Text className="text-base font-semibold text-white">Claim</Text>
        </Button>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Container -- mount once near the app root
// ---------------------------------------------------------------------------

export interface AchievementPopupContainerProps {
  achievementDefs: AchievementDef[];
}

export function AchievementPopupContainer({
  achievementDefs,
}: AchievementPopupContainerProps) {
  const popup = useAchievementPopupStore((s) => s.popup);
  const clearPopup = useAchievementPopupStore((s) => s.clearPopup);

  if (!popup) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={clearPopup}>
      <PopupContent
        item={popup}
        achievementDefs={achievementDefs}
        onDismiss={clearPopup}
      />
    </Modal>
  );
}
