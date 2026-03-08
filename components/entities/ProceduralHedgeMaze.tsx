/**
 * ProceduralHedgeMaze — R3F component that renders the hedge maze entirely
 * from procedural geometry (no GLB files).
 *
 * Wall pieces: 3 InstancedMesh clusters (outer / mid / deep depth zones)
 * via HedgeZoneMesh. Two vertical layers per piece give hedges full height.
 *
 * Decorations: procedural geometry primitives (Fountain, Bench, Column,
 * Flower) assembled from ECS hedgeDecorationsQuery entities.
 *
 * Draw call budget: 3 (zone InstancedMeshes) + ≤20 decoration primitives.
 *
 * Spec §42 — Procedural Architecture (hedge maze subsystem).
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";

import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };
import { hedgeDecorationsQuery, hedgesQuery } from "@/game/ecs/world";
import {
  generateHedgeInstances,
  type HedgeDepthZone,
  type HedgeInstance,
} from "@/game/systems/hedgeGeometry";
import { createRNG, hashString } from "@/game/utils/seedRNG";
import {
  Bench,
  type BenchProps,
  Column,
  type ColumnProps,
  Flower,
  type FlowerProps,
  Fountain,
  pickFlowerColor,
} from "./HedgeMazeDecorations.tsx";
import { HedgeZoneMesh } from "./HedgeZoneMesh.tsx";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CELL_SCALE: number = hedgeMazeConfig.cellScale;
const GRID_SIZE: number = hedgeMazeConfig.gridSize;

/** Half-extent of a maze in world units, used for zone depth classification. */
const MAZE_HALF_EXTENT = (GRID_SIZE * CELL_SCALE) / 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ZoneState = { instances: HedgeInstance[]; capacity: number };
type ZoneRecord = Record<HedgeDepthZone, ZoneState>;

const EMPTY_ZONE_STATE: ZoneRecord = {
  outer: { instances: [], capacity: 0 },
  mid: { instances: [], capacity: 0 },
  deep: { instances: [], capacity: 0 },
};

const ZONES: HedgeDepthZone[] = ["outer", "mid", "deep"];

// ---------------------------------------------------------------------------
// ProceduralHedgeMaze
// ---------------------------------------------------------------------------

/**
 * Orchestrates hedge maze rendering from ECS state.
 *
 * Reads hedgesQuery + hedgeDecorationsQuery each frame via useFrame.
 * Instance capacity grows as entities are added (never shrinks).
 * Decoration state updates only when entity count changes.
 */
export const ProceduralHedgeMaze = () => {
  const [zoneStates, setZoneStates] = useState<ZoneRecord>(EMPTY_ZONE_STATE);
  const capacityRef = useRef<Record<HedgeDepthZone, number>>({ outer: 0, mid: 0, deep: 0 });

  const [fountainPos, setFountainPos] = useState<{ x: number; z: number } | null>(null);
  const [benches, setBenches] = useState<BenchProps[]>([]);
  const [columns, setColumns] = useState<ColumnProps[]>([]);
  const [flowers, setFlowers] = useState<FlowerProps[]>([]);

  const prevHedgeCountRef = useRef(-1);
  const prevDecoCountRef = useRef(-1);

  useFrame(() => {
    // ── Hedge wall pieces ──────────────────────────────────────────────────
    const hedgeCount = hedgesQuery.entities.length;
    if (hedgeCount !== prevHedgeCountRef.current) {
      prevHedgeCountRef.current = hedgeCount;

      // Pass Y (terrain height) through so hedges sit on uneven terrain.
      const pieces = hedgesQuery.entities.map((e) => ({
        x: e.position.x,
        y: e.position.y,
        z: e.position.z,
      }));
      const rng = createRNG(hashString(`hedge-instances-${hedgeCount}`));

      // Compute the world-space center of this maze set so depth zones are
      // classified correctly regardless of which chunk the maze is in.
      // Use the bounding-box center of all hedge pieces as the maze center.
      let sumX = 0;
      let sumZ = 0;
      for (const p of pieces) {
        sumX += p.x;
        sumZ += p.z;
      }
      const mazeCenterX = pieces.length > 0 ? sumX / pieces.length : MAZE_HALF_EXTENT;
      const mazeCenterZ = pieces.length > 0 ? sumZ / pieces.length : MAZE_HALF_EXTENT;

      const allInstances = generateHedgeInstances(pieces, mazeCenterX, mazeCenterZ, GRID_SIZE, rng);

      const byZone: Record<HedgeDepthZone, HedgeInstance[]> = {
        outer: [],
        mid: [],
        deep: [],
      };
      for (const inst of allInstances) {
        byZone[inst.zone].push(inst);
      }

      const caps = capacityRef.current;
      for (const zone of ZONES) {
        if (byZone[zone].length > caps[zone]) {
          caps[zone] = byZone[zone].length;
        }
      }

      setZoneStates({
        outer: { instances: byZone.outer, capacity: caps.outer },
        mid: { instances: byZone.mid, capacity: caps.mid },
        deep: { instances: byZone.deep, capacity: caps.deep },
      });
    }

    // ── Decorations ────────────────────────────────────────────────────────
    const decoCount = hedgeDecorationsQuery.entities.length;
    if (decoCount !== prevDecoCountRef.current) {
      prevDecoCountRef.current = decoCount;

      const newBenches: BenchProps[] = [];
      const newColumns: ColumnProps[] = [];
      const newFlowers: FlowerProps[] = [];
      let newFountain: { x: number; z: number } | null = null;

      let flowerSeed = 0;
      for (const entity of hedgeDecorationsQuery.entities) {
        const { hedgeDecoration, position } = entity;
        const px = position.x;
        const pz = position.z;

        if (hedgeDecoration.category === "stone") {
          if (hedgeDecoration.itemId.includes("fountain")) {
            newFountain = { x: px, z: pz };
            // Flanking benches are part of the fountain placement
            newBenches.push({ x: px - 1.5, z: pz, rotY: Math.PI / 2 });
            newBenches.push({ x: px + 1.5, z: pz, rotY: -Math.PI / 2 });
          } else if (hedgeDecoration.itemId.includes("column")) {
            newColumns.push({ x: px, z: pz });
          } else if (hedgeDecoration.itemId.includes("bench")) {
            newBenches.push({ x: px, z: pz, rotY: 0 });
          }
        } else if (
          hedgeDecoration.category === "flowers" ||
          hedgeDecoration.category === "fences"
        ) {
          newFlowers.push({ x: px, z: pz, colorHex: pickFlowerColor(flowerSeed++) });
        }
      }

      setFountainPos(newFountain);
      setBenches(newBenches);
      setColumns(newColumns);
      setFlowers(newFlowers);
    }
  });

  return (
    <>
      {/* Hedge wall InstancedMeshes — one per depth zone (3 draw calls) */}
      {ZONES.map((zone) => (
        <HedgeZoneMesh
          key={zone}
          zone={zone}
          capacity={zoneStates[zone].capacity}
          instances={zoneStates[zone].instances}
        />
      ))}

      {/* Procedural center decorations */}
      {fountainPos ? <Fountain x={fountainPos.x} z={fountainPos.z} /> : null}
      {benches.map((b, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable decoration list after count stabilises
        <Bench key={i} x={b.x} z={b.z} rotY={b.rotY} />
      ))}
      {columns.map((c, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable decoration list
        <Column key={i} x={c.x} z={c.z} />
      ))}
      {flowers.map((f, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable decoration list
        <Flower key={i} x={f.x} z={f.z} colorHex={f.colorHex} />
      ))}
    </>
  );
};
