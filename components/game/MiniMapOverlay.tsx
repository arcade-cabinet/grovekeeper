/**
 * MiniMapOverlay -- Fullscreen map overlay for mobile.
 *
 * Shows a large minimap SVG centered on screen with a semi-transparent
 * backdrop, close button, title, and legend. Polls ECS state at 5fps
 * while open.
 */

import { XIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

import { MinimapSVG, readMinimapSnapshot } from "./MiniMap";
import type { MinimapSnapshot } from "./MiniMap";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BARK_BROWN = "#5D4037";
const SKY_MIST = "#E8F5E9";
const PADDING = 48;

// ---------------------------------------------------------------------------
// Legend dot
// ---------------------------------------------------------------------------

function LegendItem({
  color,
  label,
  shape = "circle",
}: {
  color: string;
  label: string;
  shape?: "circle" | "square";
}) {
  return (
    <View className="flex-row items-center gap-1">
      <View
        style={{
          width: 8,
          height: 8,
          backgroundColor: color,
          borderRadius: shape === "circle" ? 4 : 1,
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
}

export const MiniMapOverlay = ({ open, onClose }: MiniMapOverlayProps) => {
  const [snapshot, setSnapshot] = useState<MinimapSnapshot>(() =>
    readMinimapSnapshot(),
  );
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (!open) return;

    // Read immediately when opened
    setSnapshot(readMinimapSnapshot());

    const interval = setInterval(() => {
      setSnapshot(readMinimapSnapshot());
    }, 200);

    return () => clearInterval(interval);
  }, [open]);

  // Determine the SVG size: fill viewport with padding, leaving room for
  // title (approx 30px) and legend (approx 30px) above/below
  const mapSize = Math.min(
    screenWidth - PADDING * 2,
    screenHeight - PADDING * 2 - 60,
  );

  const handleBackdropPress = useCallback(() => {
    onClose();
  }, [onClose]);

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
        {/* Backdrop press target */}
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

        {/* Map container */}
        <View
          className="overflow-hidden rounded-xl"
          style={{
            borderWidth: 3,
            borderColor: BARK_BROWN,
          }}
        >
          <MinimapSVG snapshot={snapshot} size={Math.max(mapSize, 100)} />
        </View>

        {/* Legend */}
        <View className="mt-4 flex-row items-center gap-4">
          <LegendItem color="#FFC107" label="You" shape="circle" />
          <LegendItem color="#43A047" label="Trees" shape="circle" />
          <LegendItem color="#8D6E63" label="Soil" shape="square" />
          <LegendItem color="#64B5F6" label="Water" shape="square" />
        </View>
      </View>
    </Modal>
  );
};
