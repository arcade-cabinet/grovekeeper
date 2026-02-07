import { RiMapLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { COLORS } from "../constants/config";
import type { GridCellComponent, TreeComponent } from "../ecs/world";
import {
  gridCellsQuery,
  playerQuery,
  structuresQuery,
  treesQuery,
} from "../ecs/world";
import { MiniMapOverlay } from "./MiniMapOverlay";

// --- Data types for the snapshot ---

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

interface MinimapSnapshot {
  cells: MinimapCell[];
  trees: MinimapTree[];
  structures: MinimapStructure[];
  player: MinimapPlayer | null;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
}

// --- Color constants ---

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

// --- Desktop minimap size ---

const MINIMAP_SIZE = 160;

// --- Snapshot reader ---

function readSnapshot(): MinimapSnapshot {
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

// --- SVG rendering ---

function MinimapSVG({
  snapshot,
  size,
}: {
  snapshot: MinimapSnapshot;
  size: number;
}) {
  const { cells, trees, structures, player, bounds } = snapshot;
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxZ - bounds.minZ;

  if (worldW <= 0 || worldH <= 0) return null;

  const scaleX = size / worldW;
  const scaleZ = size / worldH;
  const cellW = scaleX;
  const cellH = scaleZ;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Minimap showing grid cells, trees, and player position"
      style={{ display: "block", borderRadius: 8 }}
    >
      <title>Minimap</title>

      {/* Background */}
      <rect width={size} height={size} fill={COLORS.soilDark} rx={8} />

      {/* Grid cells */}
      {cells.map((cell) => {
        const cx = (cell.gridX - bounds.minX) * scaleX;
        const cz = (cell.gridZ - bounds.minZ) * scaleZ;
        const fill =
          cell.type === "soil" && cell.occupied
            ? CELL_COLORS.occupied
            : (CELL_COLORS[cell.type] ?? CELL_COLORS.soil);

        return (
          <rect
            key={`cell-${cell.gridX}-${cell.gridZ}`}
            x={cx}
            y={cz}
            width={cellW}
            height={cellH}
            fill={fill}
            stroke={COLORS.soilDark}
            strokeWidth={0.3}
          />
        );
      })}

      {/* Structures */}
      {structures.map((s) => {
        const sx = (s.x - bounds.minX) * scaleX;
        const sz = (s.z - bounds.minZ) * scaleZ;

        return (
          <rect
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
          <circle
            key={`tree-${t.x}-${t.z}`}
            cx={tx + cellW / 2}
            cy={tz + cellH / 2}
            r={radius}
            fill={fill}
          />
        );
      })}

      {/* Player - pulsing gold circle */}
      {player && (
        <circle
          cx={(player.x - bounds.minX) * scaleX + cellW / 2}
          cy={(player.z - bounds.minZ) * scaleZ + cellH / 2}
          r={4}
          fill="#FFC107"
          stroke="#FF8F00"
          strokeWidth={1}
          className="minimap-player-pulse"
        />
      )}
    </svg>
  );
}

// --- Main component ---

export const MiniMap = () => {
  const [snapshot, setSnapshot] = useState<MinimapSnapshot>(() =>
    readSnapshot(),
  );
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    // Initial read
    setSnapshot(readSnapshot());

    // Poll ECS data at 5fps (200ms)
    const interval = setInterval(() => {
      setSnapshot(readSnapshot());
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Desktop minimap: visible at md+ breakpoint, top-right below HUD */}
      <div
        className="hidden md:block absolute pointer-events-auto"
        style={{
          top: 56,
          right: 12,
          background: "rgba(245, 240, 227, 0.92)",
          border: `2px solid ${COLORS.barkBrown}`,
          borderRadius: 12,
          padding: 8,
          boxShadow: "0 4px 12px rgba(26, 58, 42, 0.25)",
        }}
      >
        <MinimapSVG snapshot={snapshot} size={MINIMAP_SIZE} />
        <div
          className="text-[10px] font-bold text-center mt-1 tracking-wide uppercase"
          style={{ color: COLORS.soilDark }}
        >
          Map
        </div>
      </div>

      {/* Mobile map toggle button: visible below md breakpoint */}
      <div
        className="block md:hidden absolute pointer-events-auto"
        style={{ top: 56, right: 12 }}
      >
        <Button
          size="icon"
          variant="ghost"
          className="w-11 h-11 rounded-full"
          style={{
            background: "rgba(245, 240, 227, 0.9)",
            border: `2px solid ${COLORS.barkBrown}`,
            color: COLORS.soilDark,
          }}
          onClick={() => setOverlayOpen(true)}
          aria-label="Open map"
        >
          <RiMapLine className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile fullscreen overlay */}
      <MiniMapOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
      />

      {/* Pulse animation */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .minimap-player-pulse {
            animation: minimap-pulse 1.5s ease-in-out infinite;
          }
          @keyframes minimap-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        }
      `}</style>
    </>
  );
};
