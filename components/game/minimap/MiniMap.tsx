/**
 * MiniMap -- procedural open-world minimap (Spec §17.6).
 *
 * Desktop (>= 768px): always-visible small map in the top-right corner.
 * Mobile: map icon button that opens the fullscreen MiniMapOverlay.
 *
 * Polls ECS + store state at 5fps (200ms interval).
 */

import { MapIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

import { BARK_BROWN, SOIL_DARK } from "./colors";
import { MinimapSVG } from "./MinimapSVG";
import { MiniMapOverlay } from "./Overlay";
import { readMinimapSnapshot } from "./snapshot";
import type { MinimapSnapshot } from "./types";

const MINIMAP_SIZE = 160;

export interface MiniMapProps {
  /** Called when a campfire marker is pressed in the overlay. */
  onCampfirePress?: (fastTravelId: string | null) => void;
}

export const MiniMap = ({ onCampfirePress }: MiniMapProps = {}) => {
  const [snapshot, setSnapshot] = useState<MinimapSnapshot>(() =>
    readMinimapSnapshot(),
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const isDesktop = screenWidth >= 768;

  useEffect(() => {
    setSnapshot(readMinimapSnapshot());
    const interval = setInterval(() => setSnapshot(readMinimapSnapshot()), 200);
    return () => clearInterval(interval);
  }, []);

  const handleOpenOverlay = useCallback(() => setOverlayOpen(true), []);
  const handleCloseOverlay = useCallback(() => setOverlayOpen(false), []);

  return (
    <>
      {isDesktop ? (
        /* Desktop: always-visible minimap, top-right below HUD */
        <View
          className="absolute"
          style={{
            top: 56,
            right: 12,
            backgroundColor: "rgba(245, 240, 227, 0.92)",
            borderWidth: 2,
            borderColor: BARK_BROWN,
            borderRadius: 12,
            padding: 8,
            ...Platform.select({
              ios: {
                shadowColor: "rgba(26, 58, 42, 0.25)",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 12,
              },
              android: { elevation: 8 },
              default: {},
            }),
          }}
        >
          <MinimapSVG
            snapshot={snapshot}
            size={MINIMAP_SIZE}
            onCampfirePress={onCampfirePress}
          />
          <Text
            className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider"
            style={{ color: SOIL_DARK }}
          >
            Map
          </Text>
        </View>
      ) : (
        /* Mobile: map toggle button */
        <View className="absolute" style={{ top: 56, right: 12 }}>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: "rgba(245, 240, 227, 0.9)",
              borderWidth: 2,
              borderColor: BARK_BROWN,
            }}
            onPress={handleOpenOverlay}
            accessibilityLabel="Open map"
            accessibilityRole="button"
          >
            <Icon as={MapIcon} size={20} className="text-soil-dark" />
          </Pressable>
        </View>
      )}

      <MiniMapOverlay
        open={overlayOpen}
        onClose={handleCloseOverlay}
        onCampfirePress={onCampfirePress}
      />
    </>
  );
};
