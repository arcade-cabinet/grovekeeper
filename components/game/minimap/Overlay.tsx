/**
 * MiniMapOverlay -- fullscreen map modal for mobile.
 *
 * Shows a large MinimapSVG centered on screen with a semi-transparent
 * backdrop, close button, title, and legend. Polls ECS state at 5fps
 * while open. Campfire markers open the FastTravelMenu when pressed.
 *
 * Spec §17.6 (Map & Navigation).
 */

import { XIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

import { BARK_BROWN, CAMPFIRE_LIT_COLOR, FOG_COLOR, NPC_DOT_COLOR, PLAYER_FILL, SKY_MIST } from "./colors";
import { MinimapSVG } from "./MinimapSVG";
import { readMinimapSnapshot } from "./snapshot";
import type { MinimapSnapshot } from "./types";

const PADDING = 48;

// ---------------------------------------------------------------------------
// Legend item
// ---------------------------------------------------------------------------

function LegendItem({
  color,
  label,
  shape = "circle",
}: {
  color: string;
  label: string;
  shape?: "circle" | "square" | "diamond";
}) {
  const borderRadius =
    shape === "circle" ? 4 : shape === "diamond" ? 0 : 1;
  const transform = shape === "diamond" ? [{ rotate: "45deg" }] : undefined;

  return (
    <View className="flex-row items-center gap-1">
      <View
        style={{
          width: 8,
          height: 8,
          backgroundColor: color,
          borderRadius,
          transform,
        }}
      />
      <Text className="text-[10px] text-white/70">{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MiniMapOverlay
// ---------------------------------------------------------------------------

export interface MiniMapOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Called when a campfire marker is pressed (fastTravelId may be null). */
  onCampfirePress?: (fastTravelId: string | null) => void;
}

export const MiniMapOverlay = ({ open, onClose, onCampfirePress }: MiniMapOverlayProps) => {
  const [snapshot, setSnapshot] = useState<MinimapSnapshot>(() =>
    readMinimapSnapshot(),
  );
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (!open) return;
    setSnapshot(readMinimapSnapshot());
    const interval = setInterval(() => setSnapshot(readMinimapSnapshot()), 200);
    return () => clearInterval(interval);
  }, [open]);

  const mapSize = Math.max(
    Math.min(screenWidth - PADDING * 2, screenHeight - PADDING * 2 - 60),
    100,
  );

  const handleBackdropPress = useCallback(() => onClose(), [onClose]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
      >
        {/* Backdrop */}
        <Pressable
          className="absolute inset-0"
          onPress={handleBackdropPress}
          accessibilityLabel="Close map"
        />

        {/* Close button */}
        <View className="absolute right-4 top-4">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
            onPress={onClose}
            accessibilityLabel="Close map"
            accessibilityRole="button"
          >
            <Icon as={XIcon} size={24} className="text-white" />
          </Pressable>
        </View>

        {/* Title */}
        <Text
          className="mb-3 text-sm font-bold uppercase tracking-wider"
          style={{ color: SKY_MIST }}
        >
          World Map
        </Text>

        {/* Map */}
        <View
          className="overflow-hidden rounded-xl"
          style={{ borderWidth: 3, borderColor: BARK_BROWN }}
        >
          <MinimapSVG
            snapshot={snapshot}
            size={mapSize}
            onCampfirePress={onCampfirePress}
          />
        </View>

        {/* Legend */}
        <View className="mt-4 flex-row flex-wrap items-center justify-center gap-4">
          <LegendItem color={PLAYER_FILL} label="You" shape="circle" />
          <LegendItem color={CAMPFIRE_LIT_COLOR} label="Campfire" shape="diamond" />
          <LegendItem color={NPC_DOT_COLOR} label="NPC" shape="circle" />
          <LegendItem color={FOG_COLOR} label="Unexplored" shape="square" />
        </View>
      </View>
    </Modal>
  );
};
