/**
 * Ground — Biome-blended ground plane with optional grid overlay.
 *
 * Renders a flat plane with biome-appropriate coloring and a subtle
 * wireframe grid showing planting positions. Ported from BabylonJS
 * GroundBuilder.ts for R3F.
 */

import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export interface GroundProps {
  /** Grid size in tiles (e.g. 16 for 16x16). */
  gridSize: number;
  /** Biome type — determines base ground color. */
  biome: string;
  /** Current season for ground tinting. */
  season?: string;
  /** Whether to show the planting grid overlay. */
  showGrid?: boolean;
  /** Center position of the ground plane [x, z]. */
  center?: [number, number];
  /** Pointer down handler for tile selection (from useInteraction). */
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
}

/** Biome base colors — vibrant and distinct. */
const BIOME_COLORS: Record<string, THREE.Color> = {
  grass: new THREE.Color(0.4, 0.62, 0.25),
  soil: new THREE.Color(0.52, 0.38, 0.22),
  dirt: new THREE.Color(0.58, 0.48, 0.32),
  stone: new THREE.Color(0.56, 0.54, 0.5),
};

/** Wilderness color for areas outside zones — deep forest green. */
const WILDERNESS_COLOR = new THREE.Color(0.18, 0.32, 0.12);

/** Seasonal tints applied to ground material. */
const SEASON_TINTS: Record<string, THREE.Color> = {
  spring: new THREE.Color(1.0, 1.05, 0.95),
  summer: new THREE.Color(1.05, 1.0, 0.9),
  autumn: new THREE.Color(1.1, 0.95, 0.8),
  winter: new THREE.Color(0.9, 0.95, 1.05),
};

/** Padding beyond the grid for the ground plane. */
const WORLD_PADDING = 24;

export const Ground = ({
  gridSize,
  biome,
  season = "spring",
  showGrid = true,
  center = [0, 0],
  onPointerDown,
}: GroundProps) => {
  const groundRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.LineSegments>(null);

  // Ground extends beyond the playable grid
  const groundSize = gridSize + WORLD_PADDING * 2;
  const centerX = center[0] + gridSize / 2 - 0.5;
  const centerZ = center[1] + gridSize / 2 - 0.5;

  // Current biome color with seasonal tint
  const groundColor = useMemo(() => {
    const base = BIOME_COLORS[biome]?.clone() ?? WILDERNESS_COLOR.clone();
    const tint = SEASON_TINTS[season] ?? new THREE.Color(1, 1, 1);
    return base.multiply(tint);
  }, [biome, season]);

  // Grid lines geometry for the plantable area
  const gridGeometry = useMemo(() => {
    if (!showGrid) return null;

    const points: THREE.Vector3[] = [];
    const originX = center[0];
    const originZ = center[1];

    // Horizontal lines
    for (let i = 0; i <= gridSize; i++) {
      points.push(new THREE.Vector3(originX, 0.01, originZ + i));
      points.push(new THREE.Vector3(originX + gridSize, 0.01, originZ + i));
    }
    // Vertical lines
    for (let i = 0; i <= gridSize; i++) {
      points.push(new THREE.Vector3(originX + i, 0.01, originZ));
      points.push(new THREE.Vector3(originX + i, 0.01, originZ + gridSize));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [gridSize, showGrid, center]);

  // Animate seasonal transitions
  useFrame(() => {
    const mesh = groundRef.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.lerp(groundColor, 0.05);
  });

  return (
    <group>
      {/* Main ground plane */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.05, centerZ]}
        receiveShadow
        onPointerDown={onPointerDown}
      >
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} metalness={0} />
      </mesh>

      {/* Grid overlay */}
      {showGrid && gridGeometry && (
        <lineSegments ref={gridRef} geometry={gridGeometry}>
          <lineBasicMaterial color={0x5a4830} transparent opacity={0.15} />
        </lineSegments>
      )}
    </group>
  );
};
