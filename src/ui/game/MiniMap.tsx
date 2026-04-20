import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { COLORS } from "@/config/config";
import { koota } from "@/koota";
import { GridCell, IsPlayer, Position, Structure, Tree } from "@/traits";
import { RiMapLine } from "@/ui/icons";
import { Button } from "@/ui/primitives/button";
import { MiniMapOverlay } from "./MiniMapOverlay";

interface MinimapCell {
  gridX: number;
  gridZ: number;
  type: "soil" | "water" | "rock" | "path";
  occupied: boolean;
}

interface MinimapTree {
  x: number;
  z: number;
  stage: 0 | 1 | 2 | 3 | 4;
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

const MINIMAP_SIZE = 160;

function readSnapshot(): MinimapSnapshot {
  const cells: MinimapCell[] = [];
  const trees: MinimapTree[] = [];
  const structures: MinimapStructure[] = [];
  let player: MinimapPlayer | null = null;

  let minX = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const entity of koota.query(GridCell, Position)) {
    const gc = entity.get(GridCell);
    if (!gc) continue;
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

  for (const entity of koota.query(Tree, Position)) {
    const t = entity.get(Tree);
    const pos = entity.get(Position);
    if (t && pos) trees.push({ x: pos.x, z: pos.z, stage: t.stage });
  }

  for (const entity of koota.query(Structure, Position)) {
    const pos = entity.get(Position);
    if (pos) structures.push({ x: pos.x, z: pos.z });
  }

  const playerEntity = koota.queryFirst(IsPlayer, Position);
  if (playerEntity) {
    const pos = playerEntity.get(Position);
    if (pos) player = { x: pos.x, z: pos.z };
  }

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

function MinimapSVG(props: { snapshot: MinimapSnapshot; size: number }) {
  const worldW = () => props.snapshot.bounds.maxX - props.snapshot.bounds.minX;
  const worldH = () => props.snapshot.bounds.maxZ - props.snapshot.bounds.minZ;
  const scaleX = () => props.size / worldW();
  const scaleZ = () => props.size / worldH();

  return (
    <Show when={worldW() > 0 && worldH() > 0}>
      <svg
        viewBox={`0 0 ${props.size} ${props.size}`}
        width={props.size}
        height={props.size}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Minimap showing grid cells, trees, and player position"
        style={{ display: "block", "border-radius": "8px" }}
      >
        <title>Minimap</title>
        <rect
          width={props.size}
          height={props.size}
          fill={COLORS.soilDark}
          rx={8}
        />

        <For each={props.snapshot.cells}>
          {(cell) => {
            const cx = (cell.gridX - props.snapshot.bounds.minX) * scaleX();
            const cz = (cell.gridZ - props.snapshot.bounds.minZ) * scaleZ();
            const fill =
              cell.type === "soil" && cell.occupied
                ? CELL_COLORS.occupied
                : (CELL_COLORS[cell.type] ?? CELL_COLORS.soil);
            return (
              <rect
                x={cx}
                y={cz}
                width={scaleX()}
                height={scaleZ()}
                fill={fill}
                stroke={COLORS.soilDark}
                stroke-width={0.3}
              />
            );
          }}
        </For>

        <For each={props.snapshot.structures}>
          {(s) => {
            const sx = (s.x - props.snapshot.bounds.minX) * scaleX();
            const sz = (s.z - props.snapshot.bounds.minZ) * scaleZ();
            return (
              <rect
                x={sx - 2}
                y={sz - 2}
                width={4}
                height={4}
                fill="#9E9E9E"
                stroke="#757575"
                stroke-width={0.5}
                rx={0.5}
              />
            );
          }}
        </For>

        <For each={props.snapshot.trees}>
          {(t) => {
            const tx = (t.x - props.snapshot.bounds.minX) * scaleX();
            const tz = (t.z - props.snapshot.bounds.minZ) * scaleZ();
            const fill = TREE_STAGE_COLORS[t.stage] ?? TREE_STAGE_COLORS[0];
            const radius = 1.2 + t.stage * 0.4;
            return (
              <circle
                cx={tx + scaleX() / 2}
                cy={tz + scaleZ() / 2}
                r={radius}
                fill={fill}
              />
            );
          }}
        </For>

        <Show when={props.snapshot.player}>
          {(p) => (
            <circle
              cx={
                (p().x - props.snapshot.bounds.minX) * scaleX() + scaleX() / 2
              }
              cy={
                (p().z - props.snapshot.bounds.minZ) * scaleZ() + scaleZ() / 2
              }
              r={4}
              fill="#FFC107"
              stroke="#FF8F00"
              stroke-width={1}
              class="minimap-player-pulse"
            />
          )}
        </Show>
      </svg>
    </Show>
  );
}

export const MiniMap = () => {
  const [snapshot, setSnapshot] = createSignal<MinimapSnapshot>(readSnapshot());
  const [overlayOpen, setOverlayOpen] = createSignal(false);

  onMount(() => {
    setSnapshot(readSnapshot());
    const interval = setInterval(() => {
      setSnapshot(readSnapshot());
    }, 200);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <>
      <div
        class="hidden md:block absolute pointer-events-auto"
        style={{
          top: "56px",
          right: "12px",
          background: "rgba(245, 240, 227, 0.92)",
          border: `2px solid ${COLORS.barkBrown}`,
          "border-radius": "12px",
          padding: "8px",
          "box-shadow": "0 4px 12px rgba(26, 58, 42, 0.25)",
        }}
      >
        <MinimapSVG snapshot={snapshot()} size={MINIMAP_SIZE} />
        <div
          class="text-[10px] font-bold text-center mt-1 tracking-wide uppercase"
          style={{ color: COLORS.soilDark }}
        >
          Map
        </div>
      </div>

      <div
        class="block md:hidden absolute pointer-events-auto"
        style={{ top: "56px", right: "12px" }}
      >
        <Button
          size="icon"
          variant="ghost"
          class="w-11 h-11 rounded-full"
          style={{
            background: "rgba(245, 240, 227, 0.9)",
            border: `2px solid ${COLORS.barkBrown}`,
            color: COLORS.soilDark,
          }}
          onClick={() => setOverlayOpen(true)}
          aria-label="Open map"
        >
          <RiMapLine class="w-5 h-5" />
        </Button>
      </div>

      <MiniMapOverlay
        open={overlayOpen()}
        onClose={() => setOverlayOpen(false)}
      />

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
