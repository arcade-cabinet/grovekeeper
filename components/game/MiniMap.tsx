/**
 * MiniMap -- SVG-based minimap rendered with react-native-svg.
 *
 * Desktop: always-visible small map in the top-right corner.
 * Mobile: map icon button that opens a fullscreen MiniMapOverlay.
 *
 * Polls ECS queries at 5fps for cell, tree, structure, and player data.
 * Player indicator pulses using React Native Reanimated.
 */

import { MapIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle as SvgCircle, Rect as SvgRect } from "react-native-svg";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { GridCellComponent, TreeComponent } from "@/game/ecs/world";
import {
  playerQuery,
  structuresQuery,
  treesQuery,
  world,
} from "@/game/ecs/world";

const gridCellsQuery = world.with("gridCell", "position");

import { MiniMapOverlay } from "./MiniMapOverlay";

// ---------------------------------------------------------------------------
// Data types for the snapshot
// ---------------------------------------------------------------------------

interface MinimapCell {
  gridX: number;
  gridZ: number;
  type: GridCellComponent["type"];
  occupied: boolean;
}

interface MinimapTree {
  x: number;
  z: number;
  stage: TreeComponent["stage"];
}

interface MinimapStructure {
  x: number;
  z: number;
}

interface MinimapPlayer {
  x: number;
  z: number;
}

export interface MinimapSnapshot {
  cells: MinimapCell[];
  trees: MinimapTree[];
  structures: MinimapStructure[];
  player: MinimapPlayer | null;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
}

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------

const CELL_COLORS: Record<string, string> = {
  soil: "#8D6E63",
  water: "#64B5F6",
  rock: "#78909C",
  path: "#BCAAA4",
  occupied: "#4CAF50",
};

const TREE_STAGE_COLORS: Record<number, string> = {
  0: "#90CAF9",
  1: "#66BB6A",
  2: "#43A047",
  3: "#2E7D32",
  4: "#1B5E20",
};

const SOIL_DARK = "#3E2723";
const BARK_BROWN = "#5D4037";

// ---------------------------------------------------------------------------
// Desktop minimap size
// ---------------------------------------------------------------------------

const MINIMAP_SIZE = 160;

// ---------------------------------------------------------------------------
// Snapshot reader -- reads ECS state into a plain object
// ---------------------------------------------------------------------------

export function readMinimapSnapshot(): MinimapSnapshot {
  const cells: MinimapCell[] = [];
  const trees: MinimapTree[] = [];
  const structures: MinimapStructure[] = [];
  let player: MinimapPlayer | null = null;

  let minX = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const entity of gridCellsQuery) {
    const gc = entity.gridCell;
    const pos = entity.position;
    if (!gc || !pos) continue;

    cells.push({
      gridX: gc.gridX,
      gridZ: gc.gridZ,
      type: gc.type,
      occupied: gc.occupied,
    });

    if (gc.gridX < minX) minX = gc.gridX;
    if (gc.gridZ < minZ) minZ = gc.gridZ;
    if (gc.gridX > maxX) maxX = gc.gridX;
    if (gc.gridZ > maxZ) maxZ = gc.gridZ;
  }

  for (const entity of treesQuery) {
    const t = entity.tree;
    const pos = entity.position;
    if (!t || !pos) continue;

    trees.push({ x: pos.x, z: pos.z, stage: t.stage });
  }

  for (const entity of structuresQuery) {
    const pos = entity.position;
    if (!pos) continue;

    structures.push({ x: pos.x, z: pos.z });
  }

  for (const entity of playerQuery) {
    const pos = entity.position;
    if (!pos) continue;

    player = { x: pos.x, z: pos.z };
    break;
  }

  // Fallback if no grid cells loaded yet
  if (cells.length === 0) {
    minX = 0;
    minZ = 0;
    maxX = 12;
    maxZ = 12;
  }

  return {
    cells,
    trees,
    structures,
    player,
    bounds: { minX, minZ, maxX: maxX + 1, maxZ: maxZ + 1 },
  };
}

// ---------------------------------------------------------------------------
// Animated SVG circle for the pulsing player indicator
// ---------------------------------------------------------------------------

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

function PulsingPlayerDot({
  cx,
  cy,
}: {
  cx: number;
  cy: number;
}) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
      () => {},
      ReduceMotion.System,
    );
  }, [opacity]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedSvgCircle
      cx={cx}
      cy={cy}
      r={4}
      fill="#FFC107"
      stroke="#FF8F00"
      strokeWidth={1}
      animatedProps={animatedProps}
    />
  );
}

// ---------------------------------------------------------------------------
// SVG rendering
// ---------------------------------------------------------------------------

interface MinimapSVGProps {
  snapshot: MinimapSnapshot;
  size: number;
}

export function MinimapSVG({ snapshot, size }: MinimapSVGProps) {
  const { cells, trees, structures, player, bounds } = snapshot;
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxZ - bounds.minZ;

  const scaleX = worldW > 0 ? size / worldW : 1;
  const scaleZ = worldH > 0 ? size / worldH : 1;
  const cellW = scaleX;
  const cellH = scaleZ;

  if (worldW <= 0 || worldH <= 0) return null;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessibilityLabel="Minimap showing grid cells, trees, and player position"
    >
      {/* Background */}
      <SvgRect width={size} height={size} fill={SOIL_DARK} rx={8} />

      {/* Grid cells */}
      {cells.map((cell) => {
        const cx = (cell.gridX - bounds.minX) * scaleX;
        const cz = (cell.gridZ - bounds.minZ) * scaleZ;
        const fill =
          cell.type === "soil" && cell.occupied
            ? CELL_COLORS.occupied
            : (CELL_COLORS[cell.type] ?? CELL_COLORS.soil);

        return (
          <SvgRect
            key={`cell-${cell.gridX}-${cell.gridZ}`}
            x={cx}
            y={cz}
            width={cellW}
            height={cellH}
            fill={fill}
            stroke={SOIL_DARK}
            strokeWidth={0.3}
          />
        );
      })}

      {/* Structures */}
      {structures.map((s) => {
        const sx = (s.x - bounds.minX) * scaleX;
        const sz = (s.z - bounds.minZ) * scaleZ;

        return (
          <SvgRect
            key={`struct-${s.x}-${s.z}`}
            x={sx - 2}
            y={sz - 2}
            width={4}
            height={4}
            fill="#9E9E9E"
            stroke="#757575"
            strokeWidth={0.5}
            rx={0.5}
          />
        );
      })}

      {/* Trees */}
      {trees.map((t) => {
        const tx = (t.x - bounds.minX) * scaleX;
        const tz = (t.z - bounds.minZ) * scaleZ;
        const fill = TREE_STAGE_COLORS[t.stage] ?? TREE_STAGE_COLORS[0];
        const radius = 1.2 + t.stage * 0.4;

        return (
          <SvgCircle
            key={`tree-${t.x}-${t.z}`}
            cx={tx + cellW / 2}
            cy={tz + cellH / 2}
            r={radius}
            fill={fill}
          />
        );
      })}

      {/* Player -- pulsing gold circle */}
      {player && (
        <PulsingPlayerDot
          cx={(player.x - bounds.minX) * scaleX + cellW / 2}
          cy={(player.z - bounds.minZ) * scaleZ + cellH / 2}
        />
      )}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const MiniMap = () => {
  const [snapshot, setSnapshot] = useState<MinimapSnapshot>(() =>
    readMinimapSnapshot(),
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // Consider "desktop" at >= 768 px (md breakpoint)
  const isDesktop = screenWidth >= 768;

  useEffect(() => {
    // Initial read
    setSnapshot(readMinimapSnapshot());

    // Poll ECS data at 5fps (200ms)
    const interval = setInterval(() => {
      setSnapshot(readMinimapSnapshot());
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleOpenOverlay = useCallback(() => {
    setOverlayOpen(true);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setOverlayOpen(false);
  }, []);

  return (
    <>
      {isDesktop ? (
        /* Desktop minimap: always visible, top-right below HUD */
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
              android: {
                elevation: 8,
              },
              default: {},
            }),
          }}
        >
          <MinimapSVG snapshot={snapshot} size={MINIMAP_SIZE} />
          <Text
            className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider"
            style={{ color: SOIL_DARK }}
          >
            Map
          </Text>
        </View>
      ) : (
        /* Mobile map toggle button */
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

      {/* Mobile fullscreen overlay */}
      <MiniMapOverlay open={overlayOpen} onClose={handleCloseOverlay} />
    </>
  );
};
