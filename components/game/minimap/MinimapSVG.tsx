/**
 * MinimapSVG -- SVG renderer for the procedural open-world minimap.
 *
 * Renders a VIEW_DIAMETER × VIEW_DIAMETER chunk grid centered on the player:
 *   - Discovered chunks: biome color from TerrainChunkComponent.baseColor
 *   - Fog-of-war: dark overlay for unvisited chunks
 *   - Campfire markers: lit/unlit orange diamonds (pressable for fast travel)
 *   - NPC dots: small green circles
 *   - Player: pulsing gold circle at center
 *
 * Spec §17.6 (Map & Navigation).
 */

import React from "react";
import Svg, {
  Circle as SvgCircle,
  Polygon as SvgPolygon,
  Rect as SvgRect,
} from "react-native-svg";

import {
  CAMPFIRE_LIT_COLOR,
  CAMPFIRE_UNLIT_COLOR,
  FOG_COLOR,
  NPC_DOT_COLOR,
  SOIL_DARK,
} from "./colors";
import { PulsingPlayerDot } from "./PulsingPlayerDot";
import type { MinimapSnapshot } from "./types";

export const VIEW_RADIUS = 3;
const VIEW_DIAMETER = VIEW_RADIUS * 2 + 1; // 7

export interface MinimapSVGProps {
  snapshot: MinimapSnapshot;
  size: number;
  /** Called when a campfire marker is pressed. Passes fastTravelId (may be null). */
  onCampfirePress?: (fastTravelId: string | null) => void;
}

export function MinimapSVG({ snapshot, size, onCampfirePress }: MinimapSVGProps) {
  const { chunks, campfires, npcs, player, playerChunkX, playerChunkZ } = snapshot;

  const cellSize = size / VIEW_DIAMETER;
  const halfCell = cellSize / 2;

  /** Convert a chunk offset (dx, dz relative to player chunk) to SVG top-left corner. */
  function chunkToSvg(dx: number, dz: number) {
    return { x: (dx + VIEW_RADIUS) * cellSize, y: (dz + VIEW_RADIUS) * cellSize };
  }

  /** Convert a world position to SVG coordinates (player = center). */
  function worldToSvg(wx: number, wz: number, chunkSize: number) {
    const relX = wx - playerChunkX * chunkSize - chunkSize / 2;
    const relZ = wz - playerChunkZ * chunkSize - chunkSize / 2;
    return {
      x: size / 2 + (relX / chunkSize) * cellSize,
      y: size / 2 + (relZ / chunkSize) * cellSize,
    };
  }

  // Build a lookup for chunk discovery state
  const chunkMap = new Map(chunks.map((c) => [`${c.chunkX},${c.chunkZ}`, c]));

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessibilityLabel="Minimap showing biome terrain, campfires, NPCs, and player position"
    >
      {/* Background */}
      <SvgRect width={size} height={size} fill={SOIL_DARK} rx={8} />

      {/* Chunk grid */}
      {Array.from({ length: VIEW_DIAMETER }, (_, zi) =>
        Array.from({ length: VIEW_DIAMETER }, (_, xi) => {
          const dx = xi - VIEW_RADIUS;
          const dz = zi - VIEW_RADIUS;
          const cx = playerChunkX + dx;
          const cz = playerChunkZ + dz;
          const chunk = chunkMap.get(`${cx},${cz}`);
          const { x, y } = chunkToSvg(dx, dz);
          const fill = chunk?.discovered ? (chunk.biomeColor || FOG_COLOR) : FOG_COLOR;

          return (
            <SvgRect
              key={`chunk-${cx}-${cz}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              fill={fill}
              stroke={SOIL_DARK}
              strokeWidth={0.5}
            />
          );
        }),
      )}

      {/* Campfire markers — diamond shape, pressable */}
      {campfires.map((cf, i) => {
        // Use a rough chunkSize estimate (16) for world→SVG conversion
        const APPROX_CHUNK_SIZE = 16;
        const { x, y } = worldToSvg(cf.worldX, cf.worldZ, APPROX_CHUNK_SIZE);
        const d = 4; // half-size of diamond
        const points = `${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`;
        const fill = cf.lit ? CAMPFIRE_LIT_COLOR : CAMPFIRE_UNLIT_COLOR;

        return (
          <SvgPolygon
            key={`campfire-${i}`}
            points={points}
            fill={fill}
            stroke="#FFD180"
            strokeWidth={0.8}
            onPress={onCampfirePress ? () => onCampfirePress(cf.fastTravelId) : undefined}
          />
        );
      })}

      {/* NPC dots */}
      {npcs.map((npc, i) => {
        const APPROX_CHUNK_SIZE = 16;
        const { x, y } = worldToSvg(npc.worldX, npc.worldZ, APPROX_CHUNK_SIZE);
        return (
          <SvgCircle
            key={`npc-${i}`}
            cx={x}
            cy={y}
            r={2.5}
            fill={NPC_DOT_COLOR}
            opacity={0.85}
          />
        );
      })}

      {/* Player — always at center, pulsing gold */}
      {player && (
        <PulsingPlayerDot
          cx={size / 2 + halfCell}
          cy={size / 2 + halfCell}
        />
      )}
    </Svg>
  );
}
